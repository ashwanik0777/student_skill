"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh, revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { recordAudit } from "@/lib/admin/audit";
import { can, grantable, normalisePermissions, type Permission, type Role } from "@/lib/admin/permissions";
import { auth } from "@/lib/auth";
import { getCatalogLite } from "@/lib/catalog/server";
import { listCohorts } from "@/lib/catalog/shared";
import { db } from "@/lib/db";
import { account, announcements, forumPosts, forumReplies, forumVotes, session, user } from "@/lib/db/schema";
import { getStaff, userTag, type Staff } from "@/lib/session";
import { AI_USER_ID } from "@/lib/system-users";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const DENIED: ActionResult = { ok: false, error: "You don't have permission to do that." };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function staffWith(permission: Permission): Promise<Staff | null> {
  const staff = await getStaff();
  return staff && can(staff, permission) ? staff : null;
}

const subset = (xs: readonly string[], of: readonly string[]) => xs.every((x) => of.includes(x));

/** A sub-admin with "Manage staff" may only touch sub-admins whose rights they hold themselves. */
function canManageStaff(actor: Staff, target: { id: string; role: Role; permissions?: readonly string[] }) {
  if (target.id === actor.id || target.role !== "sub_admin" || !can(actor, "staff.manage")) return false;
  return actor.role === "admin" || subset(normalisePermissions(target.permissions ?? []), grantable(actor));
}

const NOT_GRANTABLE_MSG = "You can only grant permissions you hold yourself.";
const NOT_GRANTABLE: ActionResult = { ok: false, error: NOT_GRANTABLE_MSG };

type Target = { id: string; name: string; email: string; role: Role; permissions: string[]; suspendedAt: Date | null };

async function loadTarget(id: string): Promise<Target | undefined> {
  return db.query.user.findFirst({
    where: eq(user.id, id),
    columns: { id: true, name: true, email: true, role: true, permissions: true, suspendedAt: true },
  });
}

/** Students need "students.manage"; sub-admins need "staff.manage" (see canManageStaff); super admins only via the CLI. */
function canActOn(actor: Staff, target: Target) {
  if (target.id === actor.id || target.id === AI_USER_ID) return false;
  if (target.role === "student") return can(actor, "students.manage");
  if (target.role === "sub_admin") return canManageStaff(actor, target);
  return false;
}

function auditTarget(target: Target) {
  return target.role === "student" ? ("user" as const) : ("staff" as const);
}

/* ───────────────────────────── Accounts ───────────────────────────── */

export async function suspendAccountAction(userId: string, reason: string): Promise<ActionResult> {
  const [actor, target] = await Promise.all([getStaff(), loadTarget(userId)]);
  if (!actor || !target || !canActOn(actor, target)) return DENIED;
  if (target.suspendedAt) return { ok: true, message: `${target.name} is already suspended.` };
  const why = reason.trim().slice(0, 300) || null;
  // Independent writes in parallel: one round trip instead of three.
  await Promise.all([
    db.update(user).set({ suspendedAt: new Date(), suspendedReason: why, sessionsRevokedAt: new Date() }).where(eq(user.id, target.id)),
    db.delete(session).where(eq(session.userId, target.id)),
    recordAudit(actor, {
      action: target.role === "student" ? "student.suspend" : "staff.suspend",
      targetType: auditTarget(target),
      targetId: target.id,
      summary: `Suspended ${target.name} (${target.email})`,
      meta: why ? { reason: why } : undefined,
    }),
  ]);
  updateTag(userTag(target.id));
  updateTag("admin-overview");
  refresh();
  return { ok: true, message: `${target.name} has been suspended and signed out.` };
}

export async function restoreAccountAction(userId: string): Promise<ActionResult> {
  const [actor, target] = await Promise.all([getStaff(), loadTarget(userId)]);
  if (!actor || !target || !canActOn(actor, target)) return DENIED;
  if (!target.suspendedAt) return { ok: true, message: `${target.name} is already active.` };
  await Promise.all([
    db.update(user).set({ suspendedAt: null, suspendedReason: null }).where(eq(user.id, target.id)),
    recordAudit(actor, {
      action: target.role === "student" ? "student.restore" : "staff.restore",
      targetType: auditTarget(target),
      targetId: target.id,
      summary: `Restored ${target.name} (${target.email})`,
    }),
  ]);
  updateTag(userTag(target.id));
  updateTag("admin-overview");
  refresh();
  return { ok: true, message: `${target.name} can sign in again.` };
}

export async function signOutEverywhereAction(userId: string): Promise<ActionResult> {
  const [actor, target] = await Promise.all([getStaff(), loadTarget(userId)]);
  if (!actor || !target || !canActOn(actor, target)) return DENIED;
  await Promise.all([
    db.update(user).set({ sessionsRevokedAt: new Date() }).where(eq(user.id, target.id)),
    db.delete(session).where(eq(session.userId, target.id)),
    recordAudit(actor, {
      action: "student.signout",
      targetType: auditTarget(target),
      targetId: target.id,
      summary: `Signed ${target.name} out of all devices`,
    }),
  ]);
  updateTag(userTag(target.id));
  refresh();
  return { ok: true, message: `${target.name} has been signed out of every device.` };
}

export async function deleteAccountAction(userId: string, confirmEmail: string): Promise<ActionResult> {
  const [actor, target] = await Promise.all([getStaff(), loadTarget(userId)]);
  if (!actor || !target || !canActOn(actor, target)) return DENIED;
  if (confirmEmail.trim().toLowerCase() !== target.email.toLowerCase()) {
    return { ok: false, error: "The email you typed doesn't match this account." };
  }
  await db.transaction(async (tx) => {
    // Keep forum counters right for everyone else before the cascade removes this user's content.
    await tx.execute(sql`
      update ${forumPosts} p set reply_count = greatest(p.reply_count - x.c, 0)
      from (select post_id, count(*)::int as c from ${forumReplies} where user_id = ${target.id} group by post_id) x
      where p.id = x.post_id`);
    await tx.execute(sql`
      update ${forumPosts} set accepted_reply_id = null
      where accepted_reply_id in (select id from ${forumReplies} where user_id = ${target.id})`);
    await tx.execute(sql`
      update ${forumPosts} set vote_count = greatest(vote_count - 1, 0)
      where id in (select target_id from ${forumVotes} where user_id = ${target.id} and target_type = 'post')`);
    await tx.execute(sql`
      update ${forumReplies} set vote_count = greatest(vote_count - 1, 0)
      where id in (select target_id from ${forumVotes} where user_id = ${target.id} and target_type = 'reply')`);
    await tx.delete(user).where(eq(user.id, target.id));
  });
  await recordAudit(actor, {
    action: "student.delete",
    targetType: auditTarget(target),
    targetId: target.id,
    summary: `Deleted the account of ${target.name} (${target.email})`,
  });
  updateTag(userTag(target.id));
  updateTag("admin-overview");
  revalidatePath("/admin", "layout");
  return { ok: true, message: `${target.name}'s account and data were deleted.` };
}

/* ───────────────────────────── Staff (admin only) ───────────────────────────── */

export type StaffFormState = {
  ok?: boolean;
  message?: string;
  errors?: Partial<Record<"name" | "email" | "password" | "permissions" | "form", string>>;
};

const newStaffSchema = z.object({
  name: z.string().trim().min(2, "Enter their full name.").max(80, "Keep the name under 80 characters."),
  email: z.string().trim().toLowerCase().regex(EMAIL_RE, "Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(128, "Keep the password under 128 characters."),
});

export async function createSubAdminAction(_prev: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const actor = await staffWith("staff.manage");
  if (!actor) return { errors: { form: "You don't have permission to add staff." } };

  const mode = formData.get("mode") === "existing" ? "existing" : "new";
  const permissions = normalisePermissions(formData.getAll("permissions").map(String));
  if (permissions.length === 0) return { errors: { permissions: "Tick at least one permission." } };
  if (!subset(permissions, grantable(actor))) return { errors: { permissions: NOT_GRANTABLE_MSG } };

  if (mode === "existing") {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { errors: { email: "Enter a valid email address." } };
    const target = await db.query.user.findFirst({ where: eq(user.email, email), columns: { id: true, name: true, role: true } });
    if (!target || target.id === AI_USER_ID) return { errors: { email: "No TestPrep account uses this email yet. Create a new account instead." } };
    if (target.role !== "student") return { errors: { email: "This person is already a staff member." } };
    await Promise.all([
      db.update(user).set({ role: "sub_admin", permissions }).where(eq(user.id, target.id)),
      recordAudit(actor, {
        action: "staff.promote",
        targetType: "staff",
        targetId: target.id,
        summary: `Made ${target.name} (${email}) a sub-admin`,
        meta: { permissions },
      }),
    ]);
    updateTag(userTag(target.id));
    refresh();
    return { ok: true, message: `${target.name} is now a sub-admin.` };
  }

  const parsed = newStaffSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    const errors: StaffFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as "name" | "email" | "password";
      errors[key] ??= issue.message;
    }
    return { errors };
  }
  const { name, email, password } = parsed.data;

  // Create the account through Better Auth's internals so the password hash and credential row match a normal
  // sign-up — without signing the admin out (the public sign-up endpoint would replace the admin's session).
  const ctx = await auth.$context;
  if (await db.query.user.findFirst({ where: eq(user.email, email), columns: { id: true } })) {
    return { errors: { email: "An account with this email already exists. Choose “Existing account” instead." } };
  }
  // Same password hashing as a normal sign-up, but written directly: no session swap and no public sign-up rules.
  const hash = await ctx.password.hash(password);
  const created = { id: crypto.randomUUID().replaceAll("-", "") };
  await db.transaction(async (tx) => {
    await tx.insert(user).values({ id: created.id, name, email, emailVerified: true, role: "sub_admin", permissions });
    await tx.insert(account).values({ id: crypto.randomUUID(), accountId: created.id, providerId: "credential", userId: created.id, password: hash });
  });
  await Promise.all([
    recordAudit(actor, {
      action: "staff.create",
      targetType: "staff",
      targetId: created.id,
      summary: `Added ${name} (${email}) as a sub-admin`,
      meta: { permissions },
    }),
  ]);
  refresh();
  return { ok: true, message: `${name} can now sign in with ${email}.` };
}

/** The sub-admin this actor is allowed to manage, or null. */
async function manageableSubAdmin(actor: Staff | null, userId: string) {
  if (!actor) return null;
  const target = await loadTarget(userId);
  return target && canManageStaff(actor, target) ? target : null;
}

export async function updateStaffPermissionsAction(userId: string, permissions: string[]): Promise<ActionResult> {
  const actor = await staffWith("staff.manage");
  const target = await manageableSubAdmin(actor, userId);
  if (!actor || !target) return DENIED;
  const next = normalisePermissions(permissions);
  if (next.length === 0) return { ok: false, error: "Tick at least one permission, or remove their staff access instead." };
  if (!subset(next, grantable(actor))) return NOT_GRANTABLE;
  const before = await db.query.user.findFirst({ where: eq(user.id, target.id), columns: { permissions: true } });
  await Promise.all([
    db.update(user).set({ permissions: next }).where(eq(user.id, target.id)),
    recordAudit(actor, {
      action: "staff.permissions",
      targetType: "staff",
      targetId: target.id,
      summary: `Changed permissions for ${target.name}`,
      meta: { before: before?.permissions ?? [], after: next },
    }),
  ]);
  updateTag(userTag(target.id));
  refresh();
  return { ok: true, message: `Permissions updated for ${target.name}.` };
}

export async function resetStaffPasswordAction(userId: string, password: string): Promise<ActionResult> {
  const actor = await staffWith("staff.manage");
  const target = await manageableSubAdmin(actor, userId);
  if (!actor || !target) return DENIED;
  if (password.length < 8 || password.length > 128) return { ok: false, error: "Use 8 to 128 characters." };
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const credential = await db.query.account.findFirst({
    where: and(eq(account.userId, target.id), eq(account.providerId, "credential")),
    columns: { id: true },
  });
  await Promise.all([
    credential
      ? ctx.internalAdapter.updatePassword(target.id, hash)
      : ctx.internalAdapter.linkAccount({ userId: target.id, providerId: "credential", accountId: target.id, password: hash }),
    db.update(user).set({ sessionsRevokedAt: new Date() }).where(eq(user.id, target.id)),
    db.delete(session).where(eq(session.userId, target.id)),
    recordAudit(actor, { action: "staff.password", targetType: "staff", targetId: target.id, summary: `Reset the password for ${target.name}` }),
  ]);
  updateTag(userTag(target.id));
  return { ok: true, message: `New password set for ${target.name}. They've been signed out everywhere.` };
}

export async function removeStaffAccessAction(userId: string): Promise<ActionResult> {
  const actor = await staffWith("staff.manage");
  const target = await manageableSubAdmin(actor, userId);
  if (!actor || !target) return DENIED;
  await Promise.all([
    db.update(user).set({ role: "student", permissions: [] }).where(eq(user.id, target.id)),
    recordAudit(actor, { action: "staff.remove", targetType: "staff", targetId: target.id, summary: `Removed staff access for ${target.name} (${target.email})` }),
  ]);
  updateTag(userTag(target.id));
  refresh();
  return { ok: true, message: `${target.name} no longer has staff access.` };
}

/* ───────────────────────────── Community ───────────────────────────── */

function revalidateForum(postId: string) {
  updateTag("forum-stats");
  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
}

export async function deletePostAction(postId: string, reason: string): Promise<ActionResult> {
  const actor = await staffWith("community.moderate");
  if (!actor) return DENIED;
  const post = await db
    .select({ id: forumPosts.id, title: forumPosts.title, authorName: user.name })
    .from(forumPosts)
    .innerJoin(user, eq(user.id, forumPosts.userId))
    .where(eq(forumPosts.id, postId))
    .limit(1)
    .then((r) => r[0]);
  if (!post) return { ok: false, error: "This doubt was already removed." };
  const why = reason.trim().slice(0, 300) || null;
  await db.transaction(async (tx) => {
    await tx.delete(forumVotes).where(
      sql`(${forumVotes.targetType} = 'post' and ${forumVotes.targetId} = ${post.id})
        or (${forumVotes.targetType} = 'reply' and ${forumVotes.targetId} in (select id from ${forumReplies} where post_id = ${post.id}))`,
    );
    await tx.delete(forumPosts).where(eq(forumPosts.id, post.id));
  });
  await recordAudit(actor, {
    action: "post.delete",
    targetType: "post",
    targetId: post.id,
    summary: `Removed the doubt “${post.title}” by ${post.authorName}`,
    meta: why ? { reason: why } : undefined,
  });
  revalidateForum(post.id);
  updateTag("admin-overview");
  return { ok: true, message: "Doubt removed." };
}

export async function deleteReplyAction(replyId: string, reason: string): Promise<ActionResult> {
  const actor = await staffWith("community.moderate");
  if (!actor) return DENIED;
  const reply = await db
    .select({ id: forumReplies.id, postId: forumReplies.postId, isAi: forumReplies.isAi, authorName: user.name, postTitle: forumPosts.title })
    .from(forumReplies)
    .innerJoin(user, eq(user.id, forumReplies.userId))
    .innerJoin(forumPosts, eq(forumPosts.id, forumReplies.postId))
    .where(eq(forumReplies.id, replyId))
    .limit(1)
    .then((r) => r[0]);
  if (!reply) return { ok: false, error: "This answer was already removed." };
  const why = reason.trim().slice(0, 300) || null;
  await db.transaction(async (tx) => {
    await tx.delete(forumVotes).where(and(eq(forumVotes.targetType, "reply"), eq(forumVotes.targetId, reply.id)));
    await tx.delete(forumReplies).where(eq(forumReplies.id, reply.id));
    await tx
      .update(forumPosts)
      .set({
        replyCount: sql`greatest(${forumPosts.replyCount} - 1, 0)`,
        acceptedReplyId: sql`case when ${forumPosts.acceptedReplyId} = ${reply.id} then null else ${forumPosts.acceptedReplyId} end`,
      })
      .where(eq(forumPosts.id, reply.postId));
  });
  await recordAudit(actor, {
    action: "reply.delete",
    targetType: "reply",
    targetId: reply.id,
    summary: `Removed ${reply.isAi ? "the AI answer" : `an answer by ${reply.authorName}`} on “${reply.postTitle}”`,
    meta: why ? { reason: why, postId: reply.postId } : { postId: reply.postId },
  });
  revalidateForum(reply.postId);
  refresh();
  return { ok: true, message: "Answer removed." };
}

/* ───────────────────────────── Announcements ───────────────────────────── */

export type AnnouncementFormState = {
  ok?: boolean;
  message?: string;
  errors?: Partial<Record<"title" | "body" | "audience" | "tone" | "endsOn" | "form", string>>;
  values?: Record<string, string>;
};

const announcementSchema = z.object({
  title: z.string().trim().min(3, "Add a short title.").max(120, "Keep the title under 120 characters."),
  body: z.string().trim().min(3, "Write the message.").max(600, "Keep it under 600 characters."),
  audience: z.string().min(1, "Choose who should see this."),
  tone: z.enum(["info", "success", "warning"]),
  endsOn: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.")]),
});

export async function createAnnouncementAction(_prev: AnnouncementFormState, formData: FormData): Promise<AnnouncementFormState> {
  const actor = await staffWith("announcements.manage");
  if (!actor) return { errors: { form: "You don't have permission to post announcements." } };
  const raw = {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    audience: String(formData.get("audience") ?? "all"),
    tone: String(formData.get("tone") ?? "info"),
    endsOn: String(formData.get("endsOn") ?? ""),
  };
  const parsed = announcementSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: AnnouncementFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<AnnouncementFormState["errors"]>;
      errors[key] ??= issue.message;
    }
    return { errors, values: raw };
  }
  const { title, body, audience, tone, endsOn } = parsed.data;
  if (audience !== "all" && !listCohorts(await getCatalogLite()).some((c) => c.key === audience)) {
    return { errors: { audience: "Choose who should see this." }, values: raw };
  }
  // "Show until" is inclusive: the notice disappears after that day ends in India.
  const endsAt = endsOn ? new Date(`${endsOn}T23:59:59+05:30`) : null;
  if (endsAt && endsAt.getTime() <= Date.now()) return { errors: { endsOn: "Pick today or a later date." }, values: raw };

  const [created] = await db.insert(announcements).values({ title, body, audience, tone, endsAt, createdBy: actor.id }).returning({ id: announcements.id });
  await recordAudit(actor, {
    action: "announcement.create",
    targetType: "announcement",
    targetId: created.id,
    summary: `Posted “${title}” to ${audience === "all" ? "all students" : audience}`,
  });
  updateTag("announcements");
  refresh();
  return { ok: true, message: "Announcement posted." };
}

export async function setAnnouncementActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const actor = await staffWith("announcements.manage");
  if (!actor) return DENIED;
  const [row] = await db.update(announcements).set({ active }).where(eq(announcements.id, id)).returning({ title: announcements.title });
  if (!row) return { ok: false, error: "This announcement no longer exists." };
  await recordAudit(actor, {
    action: active ? "announcement.show" : "announcement.hide",
    targetType: "announcement",
    targetId: id,
    summary: `${active ? "Re-published" : "Hid"} “${row.title}”`,
  });
  updateTag("announcements");
  refresh();
  return { ok: true, message: active ? "Announcement is live again." : "Announcement hidden." };
}

export async function deleteAnnouncementAction(id: string): Promise<ActionResult> {
  const actor = await staffWith("announcements.manage");
  if (!actor) return DENIED;
  const [row] = await db.delete(announcements).where(eq(announcements.id, id)).returning({ title: announcements.title });
  if (!row) return { ok: false, error: "This announcement no longer exists." };
  await recordAudit(actor, { action: "announcement.delete", targetType: "announcement", targetId: id, summary: `Deleted “${row.title}”` });
  updateTag("announcements");
  refresh();
  return { ok: true, message: "Announcement deleted." };
}
