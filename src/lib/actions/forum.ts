"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { generateForumAnswer } from "@/lib/ai/reports";
import { aiAvailable } from "@/lib/ai/model";
import { db } from "@/lib/db";
import { limitMessage, rateLimit } from "@/lib/rate-limit";
import { forumPosts, forumReplies, forumVotes, user as userTable } from "@/lib/db/schema";
import { awardBadges, badgeTrackOf } from "@/lib/services/badges";
import { getCatalogLite } from "@/lib/catalog/server";
import { cohortLabelFromKey, subjectName } from "@/lib/catalog/shared";
import { requireLearner, requireUser } from "@/lib/session";
import { AI_USER_ID } from "@/lib/system-users";


async function ensureAiUser() {
  await db
    .insert(userTable)
    .values({ id: AI_USER_ID, name: "TestPrep AI", email: "ai@testprep.local", emailVerified: true, onboarded: true })
    .onConflictDoNothing();
}

async function writeAiAnswer(postId: string) {
  const post = await db.query.forumPosts.findFirst({ where: eq(forumPosts.id, postId) });
  if (!post) return false;
  const existing = await db.query.forumReplies.findFirst({ where: and(eq(forumReplies.postId, postId), eq(forumReplies.isAi, true)) });
  if (existing) return true;
  const cat = await getCatalogLite();
  const body = await generateForumAnswer({
    subject: subjectName(cat, post.subject),
    title: post.title,
    body: post.body,
    audience: `${cohortLabelFromKey(cat, post.cohort)} students`,
  });
  if (!body) return false;
  await ensureAiUser();
  await db.transaction(async (tx) => {
    await tx.insert(forumReplies).values({ postId, userId: AI_USER_ID, body, isAi: true });
    await tx.update(forumPosts).set({ replyCount: sql`${forumPosts.replyCount} + 1` }).where(eq(forumPosts.id, postId));
  });
  return true;
}

const postSchema = z.object({
  title: z.string().trim().min(10, "Make the title a little more descriptive (10+ characters).").max(150, "Keep the title under 150 characters."),
  subject: z.string().min(1, "Choose a subject.").max(40),
  body: z.string().trim().min(20, "Add a bit more detail so others can help (20+ characters).").max(5000, "That’s too long — keep it under 5,000 characters."),
  askAi: z.boolean(),
});

export type PostFormState = { errors?: Partial<Record<"title" | "subject" | "body" | "form", string>>; values?: Record<string, string> };

export async function createPostAction(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const { user, config } = await requireLearner();
  const raw = {
    title: String(formData.get("title") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
    askAi: formData.get("askAi") === "on",
  };
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: PostFormState["errors"] = {};
    for (const i of parsed.error.issues) errors[i.path[0] as "title" | "subject" | "body"] ??= i.message;
    return { errors, values: { title: raw.title, subject: raw.subject, body: raw.body } };
  }
  if (!config.subjects.some((s) => s.slug === parsed.data.subject)) {
    return { errors: { subject: "Choose one of your subjects." }, values: { title: raw.title, subject: raw.subject, body: raw.body } };
  }
  const [post] = await db
    .insert(forumPosts)
    .values({ userId: user.id, cohort: config.cohort.key, subject: parsed.data.subject, title: parsed.data.title, body: parsed.data.body })
    .returning({ id: forumPosts.id });
  await awardBadges(db, user.id, { track: { key: config.key, subjectCount: config.subjects.length } });

  const wantsAi = parsed.data.askAi && aiAvailable() && rateLimit(`forum-ai:${user.id}`, 10, 60 * 60_000).ok;
  if (wantsAi) after(() => writeAiAnswer(post.id).catch(() => {}));
  updateTag("forum-stats");
  revalidatePath("/community");
  redirect(`/community/${post.id}${wantsAi ? "?ai=1" : ""}`);
}

export async function createReplyAction(postId: string, body: string) {
  const { user, config } = await requireLearner();
  const text = body.trim();
  if (text.length < 2) return { ok: false as const, error: "Write a reply first." };
  if (text.length > 5000) return { ok: false as const, error: "Keep replies under 5,000 characters." };
  const post = await db.query.forumPosts.findFirst({ where: eq(forumPosts.id, postId), columns: { id: true } });
  if (!post) return { ok: false as const, error: "This doubt no longer exists." };
  await db.transaction(async (tx) => {
    await tx.insert(forumReplies).values({ postId, userId: user.id, body: text });
    await tx.update(forumPosts).set({ replyCount: sql`${forumPosts.replyCount} + 1` }).where(eq(forumPosts.id, postId));
  });
  await awardBadges(db, user.id, { track: badgeTrackOf(config) });
  updateTag("forum-stats");
  revalidatePath(`/community/${postId}`);
  return { ok: true as const };
}

export async function toggleVoteAction(targetType: "post" | "reply", targetId: string) {
  const user = await requireUser();
  const table = targetType === "post" ? forumPosts : forumReplies;
  const target = await db.select({ id: table.id, userId: table.userId }).from(table).where(eq(table.id, targetId));
  if (!target.length) return { ok: false as const, error: "Not found." };
  if (target[0].userId === user.id) return { ok: false as const, error: "You can’t upvote your own post." };

  const voted = await db.transaction(async (tx) => {
    const removed = await tx
      .delete(forumVotes)
      .where(and(eq(forumVotes.userId, user.id), eq(forumVotes.targetType, targetType), eq(forumVotes.targetId, targetId)))
      .returning();
    const delta = removed.length ? -1 : 1;
    if (!removed.length) await tx.insert(forumVotes).values({ userId: user.id, targetType, targetId });
    await tx.update(table).set({ voteCount: sql`greatest(${table.voteCount} + ${delta}, 0)` }).where(eq(table.id, targetId));
    return delta === 1;
  });
  return { ok: true as const, voted };
}

export async function acceptReplyAction(postId: string, replyId: string | null) {
  const user = await requireUser();
  const post = await db.query.forumPosts.findFirst({ where: eq(forumPosts.id, postId) });
  if (!post || post.userId !== user.id) return { ok: false as const, error: "Only the person who asked can accept an answer." };
  if (replyId) {
    const reply = await db.query.forumReplies.findFirst({ where: and(eq(forumReplies.id, replyId), eq(forumReplies.postId, postId)) });
    if (!reply) return { ok: false as const, error: "Reply not found." };
  }
  await db.update(forumPosts).set({ acceptedReplyId: replyId }).where(eq(forumPosts.id, postId));
  if (replyId) {
    const reply = await db.query.forumReplies.findFirst({ where: eq(forumReplies.id, replyId), columns: { userId: true, isAi: true } });
    if (reply && !reply.isAi) await awardBadges(db, reply.userId);
  }
  updateTag("forum-stats");
  revalidatePath(`/community/${postId}`);
  return { ok: true as const };
}

export async function deletePostAction(postId: string) {
  const user = await requireUser();
  await db.delete(forumPosts).where(and(eq(forumPosts.id, postId), eq(forumPosts.userId, user.id)));
  updateTag("forum-stats");
  revalidatePath("/community");
  redirect("/community");
}

export async function deleteReplyAction(replyId: string) {
  const user = await requireUser();
  const reply = await db.query.forumReplies.findFirst({ where: and(eq(forumReplies.id, replyId), eq(forumReplies.userId, user.id)) });
  if (!reply) return { ok: false as const, error: "Reply not found." };
  await db.transaction(async (tx) => {
    await tx.delete(forumReplies).where(eq(forumReplies.id, replyId));
    await tx.update(forumPosts).set({ replyCount: sql`greatest(${forumPosts.replyCount} - 1, 0)` }).where(eq(forumPosts.id, reply.postId));
    await tx
      .update(forumPosts)
      .set({ acceptedReplyId: null })
      .where(and(eq(forumPosts.id, reply.postId), eq(forumPosts.acceptedReplyId, replyId)));
  });
  updateTag("forum-stats");
  revalidatePath(`/community/${reply.postId}`);
  return { ok: true as const };
}

export async function requestAiAnswerAction(postId: string) {
  const user = await requireUser();
  if (!aiAvailable()) return { ok: false as const, error: "AI answers are unavailable right now. Please try again later." };
  const limited = rateLimit(`forum-ai:${user.id}`, 10, 60 * 60_000);
  if (!limited.ok) return { ok: false as const, error: limitMessage(limited.retryAfterSec) };
  const ok = await writeAiAnswer(postId);
  updateTag("forum-stats");
  revalidatePath(`/community/${postId}`);
  return ok ? { ok: true as const } : { ok: false as const, error: "The AI couldn’t answer this one right now." };
}
