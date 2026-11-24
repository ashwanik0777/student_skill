"use server";

import { and, asc, count, eq, inArray, ne, or, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAudit } from "@/lib/admin/audit";
import { can, type Permission } from "@/lib/admin/permissions";
import { SUBJECT_ICON_NAMES, SUBJECT_TONE_NAMES } from "@/lib/catalog/icons";
import { BANK_TAG, CATALOG_TAG, getCatalog } from "@/lib/catalog/server";
import { optionName, optionsOf, subjectName, type CatalogLite, type Track } from "@/lib/catalog/shared";
import { db } from "@/lib/db";
import { bankQuestions, catalogOptions, chapters, courseSubjects, courses, settings as settingsTable, subjects, syllabi, user, type WeeklyPart } from "@/lib/db/schema";
import { limitMessage, rateLimit } from "@/lib/rate-limit";
import { importFromDataset } from "@/lib/services/dataset-import";
import { ReviewError, generateForReview, queueForReview, recheckQuestions } from "@/lib/services/question-review";
import { getStaff, type Staff } from "@/lib/session";
import { generalSchema, rulesSchema, SETTINGS_TAG } from "@/lib/settings";
import type { ActionResult } from "./admin";

export type FormResult = { ok?: boolean; message?: string; errors?: Record<string, string> };

/**
 * Create actions navigate with a server-side redirect. Returning a path for the client to push *while* the action
 * also refreshed the router left the old page mounted next to the new one.
 */
function finishAndGo(path: string): never {
  updateTag(CATALOG_TAG);
  redirect(path);
}

const DENIED_MSG = "You don't have permission to do that.";
const DENIED: ActionResult = { ok: false, error: DENIED_MSG };
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;

async function staffWith(permission: Permission): Promise<Staff | null> {
  const staff = await getStaff();
  return staff && can(staff, permission) ? staff : null;
}

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const num = (fd: FormData, key: string) => Number(str(fd, key));
const bool = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true";
const list = (fd: FormData, key: string) => fd.getAll(key).map(String).filter(Boolean);

function zodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0] ?? "form")] ??= issue.message;
  return out;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

function invalidate() {
  updateTag(CATALOG_TAG);
  refresh();
}

/* ───────────────────────────── Boards, streams, exams ───────────────────────────── */

const optionSchema = z.object({
  kind: z.enum(["board", "stream", "exam"]),
  id: z.string().regex(SLUG_RE, "Use lowercase letters, digits, - or _ (max 40)."),
  name: z.string().trim().min(2, "Enter a name.").max(80),
  short: z.string().trim().min(1, "Enter a short name.").max(30),
  description: z.string().trim().max(200),
  note: z.string().trim().max(120),
  groupKey: z.string().trim().max(30),
  needsStream: z.boolean(),
  sort: z.number().int().min(0).max(999),
  active: z.boolean(),
});

export async function saveOptionAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return { errors: { form: DENIED_MSG } };
  const editing = str(fd, "originalId");
  const parsed = optionSchema.safeParse({
    kind: str(fd, "kind"),
    id: editing || str(fd, "id"),
    name: str(fd, "name"),
    short: str(fd, "short"),
    description: str(fd, "description"),
    note: str(fd, "note"),
    groupKey: str(fd, "groupKey"),
    needsStream: bool(fd, "needsStream"),
    sort: num(fd, "sort") || 0,
    active: bool(fd, "active"),
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const d = parsed.data;
  const values = {
    name: d.name,
    short: d.short,
    description: d.description || null,
    note: d.note || null,
    groupKey: d.kind === "stream" ? d.groupKey || null : null,
    needsStream: d.kind === "exam" ? d.needsStream : false,
    sort: d.sort,
    active: d.active,
  };
  if (editing) {
    const [row] = await db.update(catalogOptions).set(values).where(and(eq(catalogOptions.kind, d.kind), eq(catalogOptions.id, editing))).returning({ id: catalogOptions.id });
    if (!row) return { errors: { form: "This item no longer exists." } };
  } else {
    const exists = await db.query.catalogOptions.findFirst({ where: and(eq(catalogOptions.kind, d.kind), eq(catalogOptions.id, d.id)), columns: { id: true } });
    if (exists) return { errors: { id: "This ID is already in use." } };
    await db.insert(catalogOptions).values({ kind: d.kind, id: d.id, ...values });
  }
  await recordAudit(actor, { action: "option.save", targetType: "option", targetId: `${d.kind}:${d.id}`, summary: `${editing ? "Updated" : "Added"} ${d.kind} “${d.name}”` });
  invalidate();
  return { ok: true, message: `${d.name} saved.` };
}

export async function deleteOptionAction(kind: "board" | "stream" | "exam", id: string): Promise<ActionResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return DENIED;
  const col = kind === "board" ? courses.board : kind === "stream" ? courses.stream : courses.exam;
  const [{ n }] = await db.select({ n: count() }).from(courses).where(eq(col, id));
  if (n > 0) return { ok: false, error: `${n} ${n === 1 ? "course uses" : "courses use"} this. Delete or change those courses first.` };
  const [row] = await db.delete(catalogOptions).where(and(eq(catalogOptions.kind, kind), eq(catalogOptions.id, id))).returning({ name: catalogOptions.name });
  if (!row) return { ok: false, error: "This item no longer exists." };
  await recordAudit(actor, { action: "option.delete", targetType: "option", targetId: `${kind}:${id}`, summary: `Deleted ${kind} “${row.name}”` });
  invalidate();
  return { ok: true, message: `${row.name} deleted.` };
}

/* ───────────────────────────── Subjects ───────────────────────────── */

const subjectSchema = z.object({
  slug: z.string().regex(SLUG_RE, "Use lowercase letters, digits, - or _ (max 40)."),
  name: z.string().trim().min(2, "Enter a name.").max(60),
  short: z.string().trim().min(1, "Enter a short name.").max(12),
  icon: z.enum(SUBJECT_ICON_NAMES as [string, ...string[]], { message: "Pick an icon." }),
  tone: z.enum(SUBJECT_TONE_NAMES as [string, ...string[]], { message: "Pick a colour." }),
  sort: z.number().int().min(0).max(999),
  active: z.boolean(),
});

export async function saveSubjectAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return { errors: { form: DENIED_MSG } };
  const editing = str(fd, "originalSlug");
  const parsed = subjectSchema.safeParse({
    slug: editing || str(fd, "slug"),
    name: str(fd, "name"),
    short: str(fd, "short"),
    icon: str(fd, "icon"),
    tone: str(fd, "tone"),
    sort: num(fd, "sort") || 0,
    active: bool(fd, "active"),
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const d = parsed.data;
  const values = { name: d.name, short: d.short, icon: d.icon, tone: d.tone, sort: d.sort, active: d.active };
  if (editing) {
    const [row] = await db.update(subjects).set(values).where(eq(subjects.slug, editing)).returning({ slug: subjects.slug });
    if (!row) return { errors: { form: "This subject no longer exists." } };
  } else {
    if (await db.query.subjects.findFirst({ where: eq(subjects.slug, d.slug), columns: { slug: true } })) return { errors: { slug: "This ID is already in use." } };
    await db.insert(subjects).values({ slug: d.slug, ...values });
  }
  await recordAudit(actor, { action: "subject.save", targetType: "subject", targetId: d.slug, summary: `${editing ? "Updated" : "Added"} subject “${d.name}”` });
  invalidate();
  return { ok: true, message: `${d.name} saved.` };
}

export async function deleteSubjectAction(slug: string): Promise<ActionResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return DENIED;
  const [[cs], [sy]] = await Promise.all([
    db.select({ n: count() }).from(courseSubjects).where(eq(courseSubjects.subjectSlug, slug)),
    db.select({ n: count() }).from(syllabi).where(eq(syllabi.subjectSlug, slug)),
  ]);
  if (cs.n > 0 || sy.n > 0) return { ok: false, error: `This subject is used by ${cs.n} course(s) and ${sy.n} chapter list(s). Remove those first.` };
  const [row] = await db.delete(subjects).where(eq(subjects.slug, slug)).returning({ name: subjects.name });
  if (!row) return { ok: false, error: "This subject no longer exists." };
  await recordAudit(actor, { action: "subject.delete", targetType: "subject", targetId: slug, summary: `Deleted subject “${row.name}”` });
  invalidate();
  return { ok: true, message: `${row.name} deleted.` };
}

/* ───────────────────────────── Chapter lists (syllabi) ───────────────────────────── */

const syllabusSchema = z.object({
  id: z.string().regex(SLUG_RE, "Use lowercase letters, digits, - or _ (max 40)."),
  subjectSlug: z.string().min(1, "Choose a subject."),
  title: z.string().trim().min(3, "Enter a title.").max(120),
  note: z.string().trim().max(200),
});

export async function saveSyllabusAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return { errors: { form: DENIED_MSG } };
  const editing = str(fd, "originalId");
  const title = str(fd, "title");
  const parsed = syllabusSchema.safeParse({
    id: editing || str(fd, "id") || slugify(title),
    subjectSlug: str(fd, "subjectSlug"),
    title,
    note: str(fd, "note"),
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const d = parsed.data;
  if (editing) {
    const [row] = await db.update(syllabi).set({ title: d.title, note: d.note || null }).where(eq(syllabi.id, editing)).returning({ id: syllabi.id });
    if (!row) return { errors: { form: "This chapter list no longer exists." } };
  } else {
    if (!(await db.query.subjects.findFirst({ where: eq(subjects.slug, d.subjectSlug), columns: { slug: true } }))) return { errors: { subjectSlug: "Choose a subject." } };
    if (await db.query.syllabi.findFirst({ where: eq(syllabi.id, d.id), columns: { id: true } })) return { errors: { id: "This ID is already in use." } };
    const [{ n }] = await db.select({ n: count() }).from(syllabi);
    await db.insert(syllabi).values({ id: d.id, subjectSlug: d.subjectSlug, title: d.title, note: d.note || null, sort: n });
  }
  await recordAudit(actor, { action: "syllabus.save", targetType: "syllabus", targetId: d.id, summary: `${editing ? "Updated" : "Created"} chapter list “${d.title}”` });
  if (!editing) finishAndGo(`/admin/syllabus/${d.id}?created=1`);
  invalidate();
  return { ok: true, message: `${d.title} saved.` };
}

export async function deleteSyllabusAction(id: string): Promise<ActionResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return DENIED;
  const used = await db
    .select({ n: count() })
    .from(courseSubjects)
    .where(or(sql`${courseSubjects.syllabusIds} ? ${id}`, sql`${courseSubjects.borrowIds} ? ${id}`));
  if (used[0].n > 0) return { ok: false, error: `${used[0].n} course subject(s) use this chapter list. Change them first.` };
  const [row] = await db.delete(syllabi).where(eq(syllabi.id, id)).returning({ title: syllabi.title });
  if (!row) return { ok: false, error: "This chapter list no longer exists." };
  await recordAudit(actor, { action: "syllabus.delete", targetType: "syllabus", targetId: id, summary: `Deleted chapter list “${row.title}” (with its questions)` });
  updateTag(BANK_TAG);
  updateTag(CATALOG_TAG); // the caller navigates away, so no router refresh here
  return { ok: true, message: `${row.title} deleted.` };
}

const chapterName = z.string().trim().min(1, "Enter the chapter name.").max(160);
const unitName = z.string().trim().max(80);

export async function addChapterAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return { errors: { form: DENIED_MSG } };
  const syllabusId = str(fd, "syllabusId");
  const name = chapterName.safeParse(str(fd, "name"));
  const unit = unitName.safeParse(str(fd, "unit"));
  if (!name.success) return { errors: { name: name.error.issues[0].message } };
  if (!unit.success) return { errors: { unit: unit.error.issues[0].message } };
  const [{ n }] = await db.select({ n: count() }).from(chapters).where(eq(chapters.syllabusId, syllabusId));
  const inserted = await db
    .insert(chapters)
    .values({ syllabusId, name: name.data, unit: unit.data || "General", sort: n })
    .onConflictDoNothing()
    .returning({ id: chapters.id });
  if (!inserted.length) return { errors: { name: "This chapter already exists in the list." } };
  await recordAudit(actor, { action: "chapter.save", targetType: "chapter", targetId: inserted[0].id, summary: `Added chapter “${name.data}” to ${syllabusId}` });
  invalidate();
  return { ok: true, message: "Chapter added." };
}

export async function updateChapterAction(id: string, input: { name: string; unit: string }): Promise<ActionResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return DENIED;
  const name = chapterName.safeParse(input.name);
  const unit = unitName.safeParse(input.unit);
  if (!name.success) return { ok: false, error: name.error.issues[0].message };
  if (!unit.success) return { ok: false, error: unit.error.issues[0].message };
  const before = await db.query.chapters.findFirst({ where: eq(chapters.id, id) });
  if (!before) return { ok: false, error: "This chapter no longer exists." };
  const clash = await db.query.chapters.findFirst({ where: and(eq(chapters.syllabusId, before.syllabusId), eq(chapters.name, name.data), sql`${chapters.id} <> ${id}`), columns: { id: true } });
  if (clash) return { ok: false, error: "Another chapter in this list already has that name." };
  await db.transaction(async (tx) => {
    await tx.update(chapters).set({ name: name.data, unit: unit.data || "General" }).where(eq(chapters.id, id));
    // Keep bank questions attached when a chapter is renamed.
    if (before.name !== name.data) {
      await tx.update(bankQuestions).set({ chapter: name.data }).where(and(eq(bankQuestions.syllabusId, before.syllabusId), eq(bankQuestions.chapter, before.name)));
    }
  });
  await recordAudit(actor, { action: "chapter.save", targetType: "chapter", targetId: id, summary: before.name === name.data ? `Edited chapter “${name.data}”` : `Renamed chapter “${before.name}” → “${name.data}”` });
  if (before.name !== name.data) updateTag(BANK_TAG);
  invalidate();
  return { ok: true, message: "Chapter saved." };
}

export async function deleteChapterAction(id: string): Promise<ActionResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return DENIED;
  const [row] = await db.delete(chapters).where(eq(chapters.id, id)).returning({ name: chapters.name, syllabusId: chapters.syllabusId });
  if (!row) return { ok: false, error: "This chapter no longer exists." };
  await recordAudit(actor, { action: "chapter.save", targetType: "chapter", targetId: id, summary: `Removed chapter “${row.name}” from ${row.syllabusId}` });
  invalidate();
  return { ok: true, message: "Chapter removed. Its questions stay in the list as unassigned." };
}

export async function moveChapterAction(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return DENIED;
  const row = await db.query.chapters.findFirst({ where: eq(chapters.id, id) });
  if (!row) return { ok: false, error: "This chapter no longer exists." };
  const all = await db.select({ id: chapters.id }).from(chapters).where(eq(chapters.syllabusId, row.syllabusId)).orderBy(asc(chapters.sort), asc(chapters.name));
  const i = all.findIndex((c) => c.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= all.length) return { ok: true, message: "Already at the end." };
  [all[i], all[j]] = [all[j], all[i]];
  await db.transaction(async (tx) => {
    for (let k = 0; k < all.length; k++) await tx.update(chapters).set({ sort: k }).where(eq(chapters.id, all[k].id));
  });
  invalidate();
  return { ok: true, message: "Order updated." };
}

/** Paste many chapters at once: one per line, optionally "Unit | Chapter". */
export async function importChaptersAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return { errors: { form: DENIED_MSG } };
  const syllabusId = str(fd, "syllabusId");
  const defaultUnit = str(fd, "unit") || "General";
  const lines = str(fd, "text")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { errors: { text: "Paste at least one chapter." } };
  const existing = await db.select({ name: chapters.name }).from(chapters).where(eq(chapters.syllabusId, syllabusId));
  const [{ n }] = await db.select({ n: count() }).from(chapters).where(eq(chapters.syllabusId, syllabusId));
  const seen = new Set(existing.map((c) => c.name));
  const rows: { syllabusId: string; name: string; unit: string; sort: number }[] = [];
  for (const line of lines) {
    const [a, b] = line.split("|").map((x) => x.trim());
    const name = (b ?? a).slice(0, 160);
    const unit = (b ? a : defaultUnit).slice(0, 80) || "General";
    if (!name || seen.has(name)) continue;
    seen.add(name);
    rows.push({ syllabusId, name, unit, sort: n + rows.length });
  }
  if (!rows.length) return { errors: { text: "Every chapter on the list already exists." } };
  await db.insert(chapters).values(rows).onConflictDoNothing();
  await recordAudit(actor, { action: "chapter.save", targetType: "syllabus", targetId: syllabusId, summary: `Imported ${rows.length} chapters into ${syllabusId}` });
  invalidate();
  return { ok: true, message: `${rows.length} ${rows.length === 1 ? "chapter" : "chapters"} added.` };
}

/* ───────────────────────────── Courses ───────────────────────────── */

function groupLabel(key: string | null) {
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : "";
}

/** Sensible defaults for a new course, all editable afterwards. */
function courseDefaults(cat: CatalogLite, track: Track) {
  if (track.kind === "school") {
    const board = cat.options.find((o) => o.kind === "board" && o.id === track.board);
    const stream = track.stream ? cat.options.find((o) => o.kind === "stream" && o.id === track.stream) : null;
    const group = stream?.groupKey ?? stream?.id ?? null;
    return {
      name: `${board?.name ?? track.board} · Class ${track.grade}${stream ? ` · ${stream.name}` : ""}`,
      short: `Class ${track.grade}${stream ? ` · ${stream.short}` : ""}`,
      cohortKey: stream ? `g${track.grade}-${group}` : `g${track.grade}`,
      cohortLabel: stream ? `Class ${track.grade} ${groupLabel(group)}` : `Class ${track.grade}`,
      audience: `${board?.name ?? track.board}${board?.note ? ` (${board.note})` : ""} Class ${track.grade}${stream ? ` ${stream.name}` : ""} students`,
    };
  }
  const exam = cat.options.find((o) => o.kind === "exam" && o.id === track.exam);
  const stream = track.stream ? cat.options.find((o) => o.kind === "stream" && o.id === track.stream) : null;
  return {
    name: `${exam?.name ?? track.exam}${stream ? ` · ${stream.short}` : ""}`,
    short: `${exam?.short ?? track.exam}${stream ? ` · ${stream.short}` : ""}`,
    cohortKey: `exam-${track.exam}`,
    cohortLabel: `${exam?.short ?? track.exam} aspirants`,
    audience: `${exam?.name ?? track.exam} aspirants${exam?.description ? ` (Indian competitive exam, ${exam.description})` : ""}${stream ? `, domain stream ${stream.name}` : ""}`,
  };
}

function defaultWeekly(cat: CatalogLite, subjectSlugs: string[]) {
  const n = Math.max(1, subjectSlugs.length);
  const per = Math.floor(20 / n);
  const parts: WeeklyPart[] = subjectSlugs.map((subject, i) => ({ subject, count: i === 0 ? Math.max(per, 20 - per * (n - 1)) : per }));
  return { title: "Sunday Super Test", label: subjectSlugs.map((s) => subjectName(cat, s)).join(" · ") || "Mixed", durationSec: 30 * 60, parts };
}

const courseCreateSchema = z.object({
  kind: z.enum(["school", "exam"]),
  board: z.string(),
  grade: z.number().int().min(1).max(14).nullable(),
  stream: z.string(),
  exam: z.string(),
  copyFrom: z.string(),
});

export async function createCourseAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return { errors: { form: DENIED_MSG } };
  const parsed = courseCreateSchema.safeParse({
    kind: str(fd, "kind"),
    board: str(fd, "board"),
    grade: str(fd, "grade") ? num(fd, "grade") : null,
    stream: str(fd, "stream"),
    exam: str(fd, "exam"),
    copyFrom: str(fd, "copyFrom"),
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const d = parsed.data;
  const cat = await getCatalog();
  const has = (kind: "board" | "stream" | "exam", id: string) => cat.options.some((o) => o.kind === kind && o.id === id);
  let track: Track;
  if (d.kind === "school") {
    if (!has("board", d.board)) return { errors: { board: "Choose a board." } };
    if (!d.grade) return { errors: { grade: "Enter the class (e.g. 10)." } };
    if (d.stream && !has("stream", d.stream)) return { errors: { stream: "Choose a valid stream." } };
    track = { kind: "school", board: d.board, grade: d.grade, stream: d.stream || null };
  } else {
    if (!has("exam", d.exam)) return { errors: { exam: "Choose an exam." } };
    if (d.stream && !has("stream", d.stream)) return { errors: { stream: "Choose a valid stream." } };
    track = { kind: "exam", exam: d.exam, stream: d.stream || null };
  }
  const key = track.kind === "school" ? `${track.board}-${track.grade}${track.stream ? `-${track.stream}` : ""}` : `exam-${track.exam}${track.stream ? `-${track.stream}` : ""}`;
  if (cat.courses.some((c) => c.key === key)) return { errors: { form: "A course with this combination already exists." } };

  const source = d.copyFrom ? cat.courseConfigs.find((c) => c.key === d.copyFrom) : null;
  const defaults = courseDefaults(cat, track);
  const subjectSlugs = source ? source.subjects.map((s) => s.slug) : [];
  const [{ n }] = await db.select({ n: count() }).from(courses);
  await db.transaction(async (tx) => {
    await tx.insert(courses).values({
      key,
      kind: track.kind,
      board: track.kind === "school" ? track.board : null,
      grade: track.kind === "school" ? track.grade : null,
      stream: track.stream,
      exam: track.kind === "exam" ? track.exam : null,
      ...defaults,
      audience: source?.audience && source.track.kind === track.kind ? defaults.audience : defaults.audience,
      dailyQuestions: source?.daily.questions ?? 10,
      dailyDurationSec: source?.daily.durationSec ?? 15 * 60,
      weekly: source ? { title: source.weekly.title, label: source.weekly.label, durationSec: source.weekly.durationSec, parts: source.weekly.parts } : defaultWeekly(cat, subjectSlugs),
      active: false,
      sort: n,
    });
    if (source) {
      await tx.insert(courseSubjects).values(
        source.subjects.map((s, i) => ({ courseKey: key, subjectSlug: s.slug, syllabusIds: s.syllabusIds, borrowIds: s.borrowIds, strict: s.strict, sort: i })),
      );
    }
  });
  await recordAudit(actor, { action: "course.create", targetType: "course", targetId: key, summary: `Created course “${defaults.name}”${source ? ` (copied from ${source.name})` : ""}` });
  finishAndGo(`/admin/courses/${key}?created=1`);
}

const courseUpdateSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(120),
  short: z.string().trim().min(1, "Enter a short name.").max(40),
  cohortKey: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,39}$/, "Lowercase letters, digits, - or _."),
  cohortLabel: z.string().trim().min(2, "Enter a cohort label.").max(60),
  audience: z.string().trim().min(5, "Describe who the AI writes for.").max(300),
  dailyQuestions: z.number().int().min(3, "At least 3 questions.").max(50, "At most 50 questions."),
  dailyMinutes: z.number().int().min(1).max(240),
  weeklyTitle: z.string().trim().min(2).max(80),
  weeklyLabel: z.string().trim().max(120),
  weeklyMinutes: z.number().int().min(5).max(300),
  active: z.boolean(),
});

export async function updateCourseAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return { errors: { form: DENIED_MSG } };
  const key = str(fd, "key");
  const parsed = courseUpdateSchema.safeParse({
    name: str(fd, "name"),
    short: str(fd, "short"),
    cohortKey: str(fd, "cohortKey"),
    cohortLabel: str(fd, "cohortLabel"),
    audience: str(fd, "audience"),
    dailyQuestions: num(fd, "dailyQuestions"),
    dailyMinutes: num(fd, "dailyMinutes"),
    weeklyTitle: str(fd, "weeklyTitle"),
    weeklyLabel: str(fd, "weeklyLabel"),
    weeklyMinutes: num(fd, "weeklyMinutes"),
    active: bool(fd, "active"),
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const d = parsed.data;
  const current = await db.query.courses.findFirst({ where: eq(courses.key, key) });
  if (!current) return { errors: { form: "This course no longer exists." } };
  if (d.active) {
    const [{ n }] = await db.select({ n: count() }).from(courseSubjects).where(eq(courseSubjects.courseKey, key));
    if (n === 0) return { errors: { active: "Add at least one subject before switching the course on." } };
  }
  await db
    .update(courses)
    .set({
      name: d.name,
      short: d.short,
      cohortKey: d.cohortKey,
      cohortLabel: d.cohortLabel,
      audience: d.audience,
      dailyQuestions: d.dailyQuestions,
      dailyDurationSec: d.dailyMinutes * 60,
      weekly: { ...current.weekly, title: d.weeklyTitle, label: d.weeklyLabel, durationSec: d.weeklyMinutes * 60 },
      active: d.active,
    })
    .where(eq(courses.key, key));
  if (current.cohortKey !== d.cohortKey) {
    // Students already in this course move with it so leaderboards and the forum stay consistent.
    await db.execute(sql`update "user" set cohort = ${d.cohortKey} where cohort = ${current.cohortKey} and (
      case when track_kind = 'school' then board || '-' || grade::text || coalesce('-' || stream, '') else 'exam-' || exam || coalesce('-' || stream, '') end) = ${key}`);
  }
  await recordAudit(actor, { action: "course.update", targetType: "course", targetId: key, summary: `Updated course “${d.name}”${current.active !== d.active ? (d.active ? " (switched on)" : " (switched off)") : ""}` });
  invalidate();
  return { ok: true, message: "Course saved." };
}

export async function setCourseActiveAction(key: string, active: boolean): Promise<ActionResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return DENIED;
  if (active) {
    const [{ n }] = await db.select({ n: count() }).from(courseSubjects).where(eq(courseSubjects.courseKey, key));
    if (n === 0) return { ok: false, error: "Add at least one subject before switching the course on." };
  }
  const [row] = await db.update(courses).set({ active }).where(eq(courses.key, key)).returning({ name: courses.name });
  if (!row) return { ok: false, error: "This course no longer exists." };
  await recordAudit(actor, { action: "course.update", targetType: "course", targetId: key, summary: `${active ? "Switched on" : "Switched off"} course “${row.name}”` });
  invalidate();
  return { ok: true, message: `${row.name} is now ${active ? "visible to students" : "hidden from new sign-ups"}.` };
}

export async function deleteCourseAction(key: string): Promise<ActionResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return DENIED;
  const [{ n }] = await db
    .select({ n: count() })
    .from(user)
    .where(sql`(case when ${user.trackKind} = 'school' then ${user.board} || '-' || ${user.grade}::text || coalesce('-' || ${user.stream}, '') else 'exam-' || ${user.exam} || coalesce('-' || ${user.stream}, '') end) = ${key}`);
  if (n > 0) return { ok: false, error: `${n} ${n === 1 ? "student is" : "students are"} in this course. Switch it off instead of deleting it.` };
  const [row] = await db.delete(courses).where(eq(courses.key, key)).returning({ name: courses.name });
  if (!row) return { ok: false, error: "This course no longer exists." };
  await recordAudit(actor, { action: "course.delete", targetType: "course", targetId: key, summary: `Deleted course “${row.name}”` });
  updateTag(CATALOG_TAG); // the caller navigates away, so no router refresh here
  return { ok: true, message: `${row.name} deleted.` };
}

const courseSubjectSchema = z.object({
  courseKey: z.string().min(1),
  subjectSlug: z.string().min(1, "Choose a subject."),
  syllabusIds: z.array(z.string()).min(1, "Choose at least one chapter list."),
  borrowIds: z.array(z.string()),
  strict: z.boolean(),
});

export async function saveCourseSubjectAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return { errors: { form: DENIED_MSG } };
  const editing = str(fd, "id");
  const parsed = courseSubjectSchema.safeParse({
    courseKey: str(fd, "courseKey"),
    subjectSlug: str(fd, "subjectSlug"),
    syllabusIds: list(fd, "syllabusIds"),
    borrowIds: list(fd, "borrowIds"),
    strict: bool(fd, "strict"),
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const d = parsed.data;
  const cat = await getCatalog();
  const ok = (id: string) => cat.syllabi.some((s) => s.id === id && s.subjectSlug === d.subjectSlug);
  if (!d.syllabusIds.every(ok)) return { errors: { syllabusIds: "Chapter lists must belong to the chosen subject." } };
  const borrowIds = d.borrowIds.filter((id) => ok(id) && !d.syllabusIds.includes(id));
  if (editing) {
    const [row] = await db.update(courseSubjects).set({ syllabusIds: d.syllabusIds, borrowIds, strict: d.strict }).where(eq(courseSubjects.id, editing)).returning({ id: courseSubjects.id });
    if (!row) return { errors: { form: "This subject is no longer part of the course." } };
  } else {
    const [{ n }] = await db.select({ n: count() }).from(courseSubjects).where(eq(courseSubjects.courseKey, d.courseKey));
    const inserted = await db
      .insert(courseSubjects)
      .values({ courseKey: d.courseKey, subjectSlug: d.subjectSlug, syllabusIds: d.syllabusIds, borrowIds, strict: d.strict, sort: n })
      .onConflictDoNothing()
      .returning({ id: courseSubjects.id });
    if (!inserted.length) return { errors: { subjectSlug: "This subject is already part of the course." } };
    // Keep the Sunday test in step: add a small part for the new subject if it has none.
    const course = await db.query.courses.findFirst({ where: eq(courses.key, d.courseKey) });
    if (course && !course.weekly.parts.some((p) => p.subject === d.subjectSlug)) {
      await db.update(courses).set({ weekly: { ...course.weekly, parts: [...course.weekly.parts, { subject: d.subjectSlug, count: 5 }] } }).where(eq(courses.key, d.courseKey));
    }
  }
  await recordAudit(actor, { action: "course.subjects", targetType: "course", targetId: d.courseKey, summary: `${editing ? "Updated" : "Added"} ${subjectName(cat, d.subjectSlug)} in ${d.courseKey}` });
  invalidate();
  return { ok: true, message: `${subjectName(cat, d.subjectSlug)} saved.` };
}

export async function removeCourseSubjectAction(id: string): Promise<ActionResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return DENIED;
  const [row] = await db.delete(courseSubjects).where(eq(courseSubjects.id, id)).returning({ courseKey: courseSubjects.courseKey, subjectSlug: courseSubjects.subjectSlug });
  if (!row) return { ok: false, error: "This subject is no longer part of the course." };
  const course = await db.query.courses.findFirst({ where: eq(courses.key, row.courseKey) });
  if (course) {
    const parts = course.weekly.parts.filter((p) => p.subject !== row.subjectSlug);
    await db.update(courses).set({ weekly: { ...course.weekly, parts }, ...(parts.length === 0 ? { active: false } : {}) }).where(eq(courses.key, row.courseKey));
  }
  await recordAudit(actor, { action: "course.subjects", targetType: "course", targetId: row.courseKey, summary: `Removed ${row.subjectSlug} from ${row.courseKey}` });
  invalidate();
  return { ok: true, message: "Subject removed from the course." };
}

export async function moveCourseSubjectAction(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return DENIED;
  const row = await db.query.courseSubjects.findFirst({ where: eq(courseSubjects.id, id) });
  if (!row) return { ok: false, error: "This subject is no longer part of the course." };
  const all = await db.select({ id: courseSubjects.id }).from(courseSubjects).where(eq(courseSubjects.courseKey, row.courseKey)).orderBy(asc(courseSubjects.sort));
  const i = all.findIndex((c) => c.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= all.length) return { ok: true, message: "Already at the end." };
  [all[i], all[j]] = [all[j], all[i]];
  await db.transaction(async (tx) => {
    for (let k = 0; k < all.length; k++) await tx.update(courseSubjects).set({ sort: k }).where(eq(courseSubjects.id, all[k].id));
  });
  invalidate();
  return { ok: true, message: "Order updated." };
}

const weeklyPartsSchema = z
  .array(z.object({ subject: z.string().min(1), count: z.number().int().min(1).max(50), units: z.array(z.string().min(1)).optional() }))
  .min(1, "Add at least one part.")
  .max(12);

export async function saveWeeklyPartsAction(key: string, parts: unknown): Promise<ActionResult> {
  const actor = await staffWith("catalog.manage");
  if (!actor) return DENIED;
  const parsed = weeklyPartsSchema.safeParse(parts);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the Sunday test parts." };
  const [course, cat] = await Promise.all([db.query.courses.findFirst({ where: eq(courses.key, key) }), getCatalog()]);
  if (!course) return { ok: false, error: "This course no longer exists." };
  const config = cat.courseConfigs.find((c) => c.key === key);
  for (const p of parsed.data) {
    const cs = config?.subjects.find((s) => s.slug === p.subject);
    if (!cs) return { ok: false, error: `${subjectName(cat, p.subject)} is not part of this course.` };
    if (p.units?.length) {
      const units = new Set(cs.chapters.map((c) => c.unit));
      const bad = p.units.find((u) => !units.has(u));
      if (bad) return { ok: false, error: `Unit “${bad}” doesn't exist in ${subjectName(cat, p.subject)}.` };
    }
  }
  const cleaned: WeeklyPart[] = parsed.data.map((p) => ({ subject: p.subject, count: p.count, ...(p.units?.length ? { units: p.units } : {}) }));
  await db.update(courses).set({ weekly: { ...course.weekly, parts: cleaned } }).where(eq(courses.key, key));
  await recordAudit(actor, { action: "course.update", targetType: "course", targetId: key, summary: `Changed the Sunday test mix for “${course.name}”` });
  invalidate();
  return { ok: true, message: "Sunday test updated." };
}

/* ───────────────────────────── Question bank ───────────────────────────── */

const questionSchema = z.object({
  syllabusId: z.string().min(1, "Choose a chapter list."),
  chapter: z.string().trim().min(1, "Choose a chapter.").max(160),
  topic: z.string().trim().min(2, "Enter a short topic.").max(80),
  text: z.string().trim().min(10, "Write the full question.").max(2000),
  options: z.array(z.string().trim().min(1, "Every option needs text.").max(400)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(10, "Explain the answer (this is shown to students).").max(2000),
  difficulty: z.enum(["easy", "medium", "hard"]),
  active: z.boolean(),
});

async function validateQuestion(input: z.infer<typeof questionSchema>): Promise<{ error: Record<string, string> } | { error?: undefined; syllabus: { subjectSlug: string } }> {
  const syllabus = await db.query.syllabi.findFirst({ where: eq(syllabi.id, input.syllabusId), with: { chapters: { columns: { name: true } } } });
  if (!syllabus) return { error: { syllabusId: "Choose a chapter list." } };
  if (!syllabus.chapters.some((c) => c.name === input.chapter)) return { error: { chapter: "Choose a chapter from this list." } };
  if (new Set(input.options.map((o) => o.toLowerCase())).size !== 4) return { error: { options: "The four options must be different." } };
  return { syllabus };
}

export async function saveQuestionAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const actor = await staffWith("questions.manage");
  if (!actor) return { errors: { form: DENIED_MSG } };
  const id = str(fd, "id");
  const parsed = questionSchema.safeParse({
    syllabusId: str(fd, "syllabusId"),
    chapter: str(fd, "chapter"),
    topic: str(fd, "topic"),
    text: str(fd, "text"),
    options: [str(fd, "option0"), str(fd, "option1"), str(fd, "option2"), str(fd, "option3")],
    correctIndex: num(fd, "correctIndex"),
    explanation: str(fd, "explanation"),
    difficulty: str(fd, "difficulty"),
    active: bool(fd, "active"),
  });
  if (!parsed.success) {
    const errors = zodErrors(parsed.error);
    if (errors.options) errors.options = "Fill in all four options.";
    return { errors };
  }
  const d = parsed.data;
  const checked = await validateQuestion(d);
  if (checked.error) return { errors: checked.error };
  const values = { ...d, subjectSlug: checked.syllabus.subjectSlug };
  let savedId = id;
  if (id) {
    // The AI answer check describes the old wording/key; keep it only if neither changed.
    const aiCheck = sql`case when ${bankQuestions.text} = ${d.text} and ${bankQuestions.options} = ${JSON.stringify(d.options)}::jsonb
      and ${bankQuestions.correctIndex} = ${d.correctIndex} then ${bankQuestions.aiCheck} else null end`;
    const [row] = await db.update(bankQuestions).set({ ...values, aiCheck }).where(eq(bankQuestions.id, id)).returning({ id: bankQuestions.id });
    if (!row) return { errors: { form: "This question no longer exists." } };
  } else {
    const [row] = await db.insert(bankQuestions).values({ ...values, source: "admin", createdBy: actor.id }).returning({ id: bankQuestions.id });
    savedId = row.id;
  }
  await recordAudit(actor, { action: "question.save", targetType: "question", targetId: savedId, summary: `${id ? "Edited" : "Added"} a ${d.difficulty} question in “${d.chapter}” (${d.syllabusId})` });
  updateTag(BANK_TAG);
  if (!id) redirect("/admin/questions?saved=1");
  refresh();
  return { ok: true, message: "Question saved." };
}

export async function setQuestionActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const actor = await staffWith("questions.manage");
  if (!actor) return DENIED;
  const [row] = await db.update(bankQuestions).set({ active }).where(eq(bankQuestions.id, id)).returning({ chapter: bankQuestions.chapter });
  if (!row) return { ok: false, error: "This question no longer exists." };
  await recordAudit(actor, { action: "question.save", targetType: "question", targetId: id, summary: `${active ? "Enabled" : "Disabled"} a question in “${row.chapter}”` });
  updateTag(BANK_TAG);
  refresh();
  return { ok: true, message: active ? "Question is back in use." : "Question hidden from tests." };
}

export async function deleteQuestionAction(id: string): Promise<ActionResult> {
  const actor = await staffWith("questions.manage");
  if (!actor) return DENIED;
  const [row] = await db.delete(bankQuestions).where(eq(bankQuestions.id, id)).returning({ chapter: bankQuestions.chapter });
  if (!row) return { ok: false, error: "This question no longer exists." };
  await recordAudit(actor, { action: "question.delete", targetType: "question", targetId: id, summary: `Deleted a question from “${row.chapter}”` });
  updateTag(BANK_TAG); // callers refresh or navigate themselves
  return { ok: true, message: "Question deleted." };
}

const importSchema = z.array(
  z.object({
    chapter: z.string().trim().min(1).max(160),
    topic: z.string().trim().min(1).max(80),
    text: z.string().trim().min(10).max(2000),
    options: z.array(z.string().trim().min(1).max(400)).length(4),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string().trim().min(5).max(2000),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  }),
);

/** Paste a JSON array of questions for one chapter list. */
export async function importQuestionsAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const actor = await staffWith("questions.manage");
  if (!actor) return { errors: { form: DENIED_MSG } };
  const syllabusId = str(fd, "syllabusId");
  let raw: unknown;
  try {
    raw = JSON.parse(str(fd, "json"));
  } catch {
    return { errors: { json: "That isn't valid JSON." } };
  }
  const parsed = importSchema.max(500, "Import at most 500 questions at a time.").safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { errors: { json: `Question ${Number(issue.path[0] ?? 0) + 1}: ${issue.path.slice(1).join(".") || "item"} — ${issue.message}` } };
  }
  const syllabus = await db.query.syllabi.findFirst({ where: eq(syllabi.id, syllabusId), with: { chapters: { columns: { name: true } } } });
  if (!syllabus) return { errors: { syllabusId: "Choose a chapter list." } };
  const names = new Set(syllabus.chapters.map((c) => c.name));
  const unknown = [...new Set(parsed.data.map((q) => q.chapter).filter((c) => !names.has(c)))];
  if (unknown.length) return { errors: { json: `These chapters aren't in the list: ${unknown.slice(0, 5).join(", ")}${unknown.length > 5 ? "…" : ""}` } };
  if (!parsed.data.length) return { errors: { json: "The array is empty." } };
  const sourceNote = str(fd, "sourceNote").slice(0, 200);
  if (bool(fd, "review")) {
    // From an outside source: park in the review queue (duplicates of existing questions are skipped).
    const { added, skipped } = await queueForReview(
      parsed.data.map((q) => ({ ...q, subject: syllabus.subjectSlug, syllabusId })),
      { source: "import", sourceNote: sourceNote || "Imported JSON", createdBy: actor.id },
    );
    await recordAudit(actor, { action: "question.import", targetType: "syllabus", targetId: syllabusId, summary: `Imported ${added} questions into “${syllabus.title}” for review${sourceNote ? ` (${sourceNote})` : ""}` });
    refresh();
    return { ok: true, message: `${added} question${added === 1 ? "" : "s"} sent to the review queue${skipped ? ` · ${skipped} duplicate${skipped === 1 ? "" : "s"} skipped` : ""}.` };
  }
  await db.insert(bankQuestions).values(parsed.data.map((q) => ({ ...q, syllabusId, subjectSlug: syllabus.subjectSlug, source: "admin" as const, sourceNote: sourceNote || null, createdBy: actor.id })));
  await recordAudit(actor, { action: "question.import", targetType: "syllabus", targetId: syllabusId, summary: `Imported ${parsed.data.length} questions into “${syllabus.title}”` });
  updateTag(BANK_TAG);
  refresh();
  return { ok: true, message: `${parsed.data.length} questions imported.` };
}

/* ───────────────────────────── Review queue ───────────────────────────── */

const REVIEW_STATE = { approve: "approved", reject: "rejected", requeue: "pending" } as const;
const REVIEW_DONE = { approve: "approved — now used in tests", reject: "rejected", requeue: "back in the review queue" } as const;

/** Approve / reject / send back questions from the review queue. Questions already in the bank are never touched here. */
export async function reviewQuestionsAction(ids: string[], decision: keyof typeof REVIEW_STATE): Promise<ActionResult> {
  const actor = await staffWith("questions.manage");
  if (!actor) return DENIED;
  if (!(decision in REVIEW_STATE)) return { ok: false, error: "Unknown action." };
  const list = [...new Set((Array.isArray(ids) ? ids : []).filter((x): x is string => typeof x === "string" && x.length > 0))].slice(0, 100);
  if (!list.length) return { ok: false, error: "Select at least one question." };
  const target = REVIEW_STATE[decision];
  const rows = await db
    .update(bankQuestions)
    .set({ review: target })
    .where(and(inArray(bankQuestions.id, list), inArray(bankQuestions.review, ["pending", "rejected"]), ne(bankQuestions.review, target)))
    .returning({ id: bankQuestions.id, chapter: bankQuestions.chapter });
  if (!rows.length) return { ok: false, error: "These questions were already handled." };
  const n = rows.length;
  await recordAudit(actor, {
    action: `question.${decision}`,
    targetType: "question",
    targetId: n === 1 ? rows[0].id : null,
    summary: `${decision === "approve" ? "Approved" : decision === "reject" ? "Rejected" : "Sent back to review"} ${n} question${n === 1 ? "" : "s"}${n === 1 ? ` in “${rows[0].chapter}”` : ""}`,
    meta: n > 1 ? { ids: rows.map((r) => r.id) } : undefined,
  });
  updateTag(BANK_TAG);
  refresh();
  return { ok: true, message: `${n} question${n === 1 ? "" : "s"} ${REVIEW_DONE[decision]}.` };
}

/** Permanently removes rejected questions (only rejected ones — the bank itself is edited elsewhere). */
export async function deleteRejectedAction(ids: string[]): Promise<ActionResult> {
  const actor = await staffWith("questions.manage");
  if (!actor) return DENIED;
  const list = [...new Set((Array.isArray(ids) ? ids : []).filter((x): x is string => typeof x === "string" && x.length > 0))].slice(0, 100);
  if (!list.length) return { ok: false, error: "Select at least one question." };
  const rows = await db
    .delete(bankQuestions)
    .where(and(inArray(bankQuestions.id, list), eq(bankQuestions.review, "rejected")))
    .returning({ id: bankQuestions.id });
  if (!rows.length) return { ok: false, error: "These questions were already handled." };
  await recordAudit(actor, { action: "question.delete", targetType: "question", targetId: rows.length === 1 ? rows[0].id : null, summary: `Deleted ${rows.length} rejected question${rows.length === 1 ? "" : "s"}` });
  updateTag(BANK_TAG);
  refresh();
  return { ok: true, message: `${rows.length} question${rows.length === 1 ? "" : "s"} deleted.` };
}

const generateSchema = z.object({
  syllabusId: z.string().min(1, "Choose a chapter list."),
  chapter: z.string().trim().max(160),
  count: z.number().int().min(5, "Ask for 5–20 questions.").max(20, "Ask for 5–20 questions."),
  difficulty: z.enum(["adaptive", "easy", "medium", "hard"]),
});

/** Ask the AI model for new questions on a chapter list; they wait in the review queue. */
export async function generateQuestionsAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const actor = await staffWith("questions.manage");
  if (!actor) return { errors: { form: DENIED_MSG } };
  const parsed = generateSchema.safeParse({ syllabusId: str(fd, "syllabusId"), chapter: str(fd, "chapter"), count: num(fd, "count"), difficulty: str(fd, "difficulty") });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const limited = rateLimit(`ai-generate:${actor.id}`, 30, 60 * 60_000);
  if (!limited.ok) return { errors: { form: limitMessage(limited.retryAfterSec) } };
  const d = parsed.data;
  try {
    const r = await generateForReview({ syllabusId: d.syllabusId, chapter: d.chapter || null, count: d.count, difficulty: d.difficulty, createdBy: actor.id });
    await recordAudit(actor, {
      action: "question.generate",
      targetType: "syllabus",
      targetId: d.syllabusId,
      summary: `Generated ${r.added} AI question${r.added === 1 ? "" : "s"} for review in ${r.subjectName} — “${r.syllabusTitle}” (${r.chapters.join(", ")})`,
    });
    refresh();
    if (!r.added) return { errors: { form: "Every question the AI wrote is already in the bank. Try another chapter." } };
    return {
      ok: true,
      message: `${r.added} new question${r.added === 1 ? "" : "s"} waiting for review${r.skipped ? ` · ${r.skipped} duplicate${r.skipped === 1 ? "" : "s"} skipped` : ""}.`,
    };
  } catch (error) {
    if (error instanceof ReviewError) return { errors: { form: error.message } };
    throw error;
  }
}

const datasetSchema = z.object({
  datasetId: z.string().min(1, "Choose a dataset."),
  syllabusId: z.string().min(1, "Choose a chapter list."),
  count: z.number().int().min(5).max(30),
});

/** Pull a sample from an open dataset; the AI matches each question to a chapter and it waits for review. */
export async function importDatasetAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const actor = await staffWith("questions.manage");
  if (!actor) return { errors: { form: DENIED_MSG } };
  const parsed = datasetSchema.safeParse({ datasetId: str(fd, "datasetId"), syllabusId: str(fd, "syllabusId"), count: num(fd, "count") });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  const limited = rateLimit(`ai-dataset:${actor.id}`, 20, 60 * 60_000);
  if (!limited.ok) return { errors: { form: limitMessage(limited.retryAfterSec) } };
  try {
    const r = await importFromDataset({ ...parsed.data, createdBy: actor.id });
    await recordAudit(actor, {
      action: "question.import",
      targetType: "syllabus",
      targetId: parsed.data.syllabusId,
      summary: `Imported ${r.added} question${r.added === 1 ? "" : "s"} from ${r.dataset} into ${r.subjectName} — “${r.syllabusTitle}” for review`,
    });
    refresh();
    if (!r.added) return { errors: { form: `None of the ${r.looked} questions sampled fit this chapter list. Try again (each run samples a different part) or pick another dataset.` } };
    return { ok: true, message: `${r.added} question${r.added === 1 ? "" : "s"} waiting for review · ${r.unmatched} of ${r.looked} sampled didn't fit the chapters.` };
  } catch (error) {
    if (error instanceof ReviewError) return { errors: { form: error.message } };
    throw error;
  }
}

/** Let the AI answer some queued questions on its own and record whether it agrees with the key. */
export async function recheckQuestionsAction(ids: string[]): Promise<ActionResult> {
  const actor = await staffWith("questions.manage");
  if (!actor) return DENIED;
  const list = [...new Set((Array.isArray(ids) ? ids : []).filter((x): x is string => typeof x === "string" && x.length > 0))].slice(0, 20);
  if (!list.length) return { ok: false, error: "Nothing to check." };
  const limited = rateLimit(`ai-check:${actor.id}`, 30, 60 * 60_000);
  if (!limited.ok) return { ok: false, error: limitMessage(limited.retryAfterSec) };
  try {
    const n = await recheckQuestions(list);
    await recordAudit(actor, { action: "question.check", targetType: "question", targetId: n === 1 ? list[0] : null, summary: `AI double-checked ${n} question${n === 1 ? "" : "s"}` });
    updateTag(BANK_TAG);
    refresh();
    return { ok: true, message: `Checked ${n} question${n === 1 ? "" : "s"}.` };
  } catch (error) {
    if (error instanceof ReviewError) return { ok: false, error: error.message };
    throw error;
  }
}

/* ───────────────────────────── Settings ───────────────────────────── */

export async function saveRulesAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const actor = await staffWith("settings.manage");
  if (!actor) return { errors: { form: DENIED_MSG } };
  const parsed = rulesSchema.safeParse({
    correctionDays: num(fd, "correctionDays"),
    minDaysInClass: num(fd, "minDaysInClass"),
    examSwitchDays: num(fd, "examSwitchDays"),
    windowStartMonth: num(fd, "windowStartMonth"),
    windowStartDay: num(fd, "windowStartDay"),
    windowEndMonth: num(fd, "windowEndMonth"),
    windowEndDay: num(fd, "windowEndDay"),
    promotionAlwaysOpen: bool(fd, "promotionAlwaysOpen"),
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  await db
    .insert(settingsTable)
    .values({ key: "rules", value: parsed.data })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: parsed.data, updatedAt: new Date() } });
  await recordAudit(actor, { action: "settings.save", targetType: "settings", targetId: "rules", summary: "Changed course-change rules", meta: parsed.data });
  updateTag(SETTINGS_TAG);
  refresh();
  return { ok: true, message: "Rules saved." };
}

export async function saveGeneralAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const actor = await staffWith("settings.manage");
  if (!actor) return { errors: { form: DENIED_MSG } };
  const parsed = generalSchema.safeParse({ signupsOpen: bool(fd, "signupsOpen"), authNotice: str(fd, "authNotice") });
  if (!parsed.success) return { errors: zodErrors(parsed.error) };
  await db
    .insert(settingsTable)
    .values({ key: "general", value: parsed.data })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: parsed.data, updatedAt: new Date() } });
  await recordAudit(actor, { action: "settings.save", targetType: "settings", targetId: "general", summary: `Sign-ups ${parsed.data.signupsOpen ? "open" : "paused"}${parsed.data.authNotice ? ", notice updated" : ""}` });
  updateTag(SETTINGS_TAG);
  refresh();
  return { ok: true, message: "Settings saved." };
}

export { inArray, optionName, optionsOf };
