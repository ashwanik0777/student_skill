import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { BANK_TAG, getCatalog } from "@/lib/catalog/server";
import { db } from "@/lib/db";
import { bankQuestions, chapters, courseSubjects, syllabi, user } from "@/lib/db/schema";

/** SQL for a student's course key, derived from the track columns on the user row. */
const studentCourseKey = sql<string>`case when ${user.trackKind} = 'school'
  then ${user.board} || '-' || ${user.grade}::text || coalesce('-' || ${user.stream}, '')
  else 'exam-' || ${user.exam} || coalesce('-' || ${user.stream}, '') end`;

/** Students per course key (only students who finished onboarding). */
export async function studentCountsByCourse() {
  const rows = await db
    .select({ key: studentCourseKey, n: count() })
    .from(user)
    .where(and(eq(user.role, "student"), eq(user.onboarded, true), sql`${user.trackKind} is not null`))
    .groupBy(studentCourseKey);
  return new Map(rows.map((r) => [r.key, r.n]));
}

export async function listCoursesAdmin() {
  const [cat, students] = await Promise.all([getCatalog(), studentCountsByCourse()]);
  return cat.courseConfigs.map((c) => ({ ...c, students: students.get(c.key) ?? 0 }));
}

export async function getCourseAdmin(key: string) {
  const [cat, students, rows, questionCounts] = await Promise.all([
    getCatalog(),
    studentCountsByCourse(),
    db.select().from(courseSubjects).where(eq(courseSubjects.courseKey, key)).orderBy(asc(courseSubjects.sort)),
    db
      .select({ syllabusId: bankQuestions.syllabusId, n: count() })
      .from(bankQuestions)
      .where(and(eq(bankQuestions.active, true), eq(bankQuestions.review, "approved")))
      .groupBy(bankQuestions.syllabusId),
  ]);
  const config = cat.courseConfigs.find((c) => c.key === key);
  if (!config) return null;
  const qBySyllabus = new Map(questionCounts.map((q) => [q.syllabusId, q.n]));
  return {
    config,
    students: students.get(key) ?? 0,
    subjects: rows.map((r) => {
      const pools = [...new Set([...r.syllabusIds, ...r.borrowIds])];
      return {
        id: r.id,
        slug: r.subjectSlug,
        syllabusIds: r.syllabusIds,
        borrowIds: r.borrowIds,
        strict: r.strict,
        sort: r.sort,
        chapters: config.subjects.find((s) => s.slug === r.subjectSlug)?.chapters.length ?? 0,
        questions: pools.reduce((n, id) => n + (qBySyllabus.get(id) ?? 0), 0),
      };
    }),
  };
}

export async function listSyllabiAdmin() {
  const [cat, questionCounts, usage] = await Promise.all([
    getCatalog(),
    db.select({ syllabusId: bankQuestions.syllabusId, n: count() }).from(bankQuestions).where(eq(bankQuestions.review, "approved")).groupBy(bankQuestions.syllabusId),
    db.select({ ids: courseSubjects.syllabusIds, borrow: courseSubjects.borrowIds, courseKey: courseSubjects.courseKey }).from(courseSubjects),
  ]);
  const q = new Map(questionCounts.map((x) => [x.syllabusId, x.n]));
  const usedBy = new Map<string, Set<string>>();
  for (const u of usage) {
    for (const id of [...u.ids, ...u.borrow]) {
      const set = usedBy.get(id) ?? new Set<string>();
      set.add(u.courseKey);
      usedBy.set(id, set);
    }
  }
  return cat.syllabi.map((s) => ({ ...s, questions: q.get(s.id) ?? 0, usedBy: [...(usedBy.get(s.id) ?? [])] }));
}

export async function getSyllabusAdmin(id: string) {
  const [row, chapterRows, questionRows, usage, cat] = await Promise.all([
    db.query.syllabi.findFirst({ where: eq(syllabi.id, id) }),
    db.select().from(chapters).where(eq(chapters.syllabusId, id)).orderBy(asc(chapters.sort), asc(chapters.name)),
    db
      .select({ chapter: bankQuestions.chapter, n: count() })
      .from(bankQuestions)
      .where(and(eq(bankQuestions.syllabusId, id), eq(bankQuestions.review, "approved")))
      .groupBy(bankQuestions.chapter),
    db.select({ courseKey: courseSubjects.courseKey, ids: courseSubjects.syllabusIds, borrow: courseSubjects.borrowIds }).from(courseSubjects),
    getCatalog(),
  ]);
  if (!row) return null;
  const q = new Map(questionRows.map((x) => [x.chapter, x.n]));
  const usedBy = usage
    .filter((u) => u.ids.includes(id) || u.borrow.includes(id))
    .map((u) => ({ key: u.courseKey, name: cat.courses.find((c) => c.key === u.courseKey)?.name ?? u.courseKey, borrowOnly: !u.ids.includes(id) }));
  const orphanQuestions = questionRows.filter((x) => !chapterRows.some((c) => c.name === x.chapter)).reduce((n, x) => n + x.n, 0);
  return {
    syllabus: row,
    chapters: chapterRows.map((c) => ({ ...c, questions: q.get(c.name) ?? 0 })),
    usedBy,
    totalQuestions: questionRows.reduce((n, x) => n + x.n, 0),
    orphanQuestions,
  };
}

export async function subjectUsage() {
  const [cs, sy, bq] = await Promise.all([
    db.select({ slug: courseSubjects.subjectSlug, n: count() }).from(courseSubjects).groupBy(courseSubjects.subjectSlug),
    db.select({ slug: syllabi.subjectSlug, n: count() }).from(syllabi).groupBy(syllabi.subjectSlug),
    db.select({ slug: bankQuestions.subjectSlug, n: count() }).from(bankQuestions).groupBy(bankQuestions.subjectSlug),
  ]);
  const m = new Map<string, { courses: number; syllabi: number; questions: number }>();
  const get = (slug: string) => m.get(slug) ?? { courses: 0, syllabi: 0, questions: 0 };
  for (const r of cs) m.set(r.slug, { ...get(r.slug), courses: r.n });
  for (const r of sy) m.set(r.slug, { ...get(r.slug), syllabi: r.n });
  for (const r of bq) m.set(r.slug, { ...get(r.slug), questions: r.n });
  return m;
}

/* ───────────────────────────── Question bank ───────────────────────────── */

export const QUESTIONS_PAGE_SIZE = 25;

export type QuestionFilters = { q?: string; syllabus?: string; chapter?: string; difficulty?: string; status?: "active" | "inactive"; page?: number };

/**
 * One page of the question bank for the admin list.
 * Cached under the bank tag — every write to `bank_questions` expires it — so browsing pages and filters again
 * costs no database round trip. Rows and the total come back in a single query (`count(*) over ()`), which needs
 * one pooled connection instead of two.
 */
export async function listQuestionsAdmin(f: QuestionFilters) {
  "use cache";
  cacheLife("minutes");
  cacheTag(BANK_TAG);
  const page = Math.max(1, Math.floor(f.page ?? 1) || 1);
  const term = f.q?.trim();
  const like = term ? `%${term.replace(/[\\%_]/g, (m) => `\\${m}`)}%` : "";
  const where = and(
    eq(bankQuestions.review, "approved"),
    f.syllabus ? eq(bankQuestions.syllabusId, f.syllabus) : undefined,
    f.chapter ? eq(bankQuestions.chapter, f.chapter) : undefined,
    f.difficulty === "easy" || f.difficulty === "medium" || f.difficulty === "hard" ? eq(bankQuestions.difficulty, f.difficulty) : undefined,
    f.status === "active" ? eq(bankQuestions.active, true) : f.status === "inactive" ? eq(bankQuestions.active, false) : undefined,
    term ? or(ilike(bankQuestions.text, like), ilike(bankQuestions.topic, like), eq(bankQuestions.id, term)) : undefined,
  );
  const found = await db
    .select({
      id: bankQuestions.id,
      syllabusId: bankQuestions.syllabusId,
      subjectSlug: bankQuestions.subjectSlug,
      chapter: bankQuestions.chapter,
      topic: bankQuestions.topic,
      text: bankQuestions.text,
      difficulty: bankQuestions.difficulty,
      active: bankQuestions.active,
      source: bankQuestions.source,
      updatedAt: bankQuestions.updatedAt,
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(bankQuestions)
    .where(where)
    .orderBy(desc(bankQuestions.updatedAt), asc(bankQuestions.id))
    .limit(QUESTIONS_PAGE_SIZE)
    .offset((page - 1) * QUESTIONS_PAGE_SIZE);
  // A page past the end returns no rows (and so no total); only then is a separate count needed.
  const total = found[0]?.total ?? (page > 1 ? (await db.select({ n: count() }).from(bankQuestions).where(where))[0].n : 0);
  return { rows: found, total, page, pages: Math.max(1, Math.ceil(total / QUESTIONS_PAGE_SIZE)) };
}

/** One bank question for the edit form (cached under the bank tag, like the list). */
export async function getQuestionAdmin(id: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(BANK_TAG);
  return (await db.query.bankQuestions.findFirst({ where: eq(bankQuestions.id, id) })) ?? null;
}

/** How many active bank questions each course subject can draw on (admin coverage view). */
export async function bankCoverage() {
  const [cat, rows] = await Promise.all([
    getCatalog(),
    db
      .select({ syllabusId: bankQuestions.syllabusId, chapter: bankQuestions.chapter, n: count() })
      .from(bankQuestions)
      .where(and(eq(bankQuestions.active, true), eq(bankQuestions.review, "approved")))
      .groupBy(bankQuestions.syllabusId, bankQuestions.chapter),
  ]);
  const byPool = new Map<string, { chapter: string; n: number }[]>();
  for (const r of rows) byPool.set(r.syllabusId, [...(byPool.get(r.syllabusId) ?? []), { chapter: r.chapter, n: r.n }]);
  const low: { course: string; courseName: string; subject: string; usable: number }[] = [];
  for (const c of cat.courseConfigs) {
    if (!c.active) continue;
    for (const s of c.subjects) {
      const allowed = new Set(s.chapters.map((x) => x.name));
      const pools = [...new Set([...s.syllabusIds, ...s.borrowIds])];
      let usable = 0;
      for (const id of pools) for (const x of byPool.get(id) ?? []) if (!s.strict || allowed.has(x.chapter)) usable += x.n;
      if (usable < 5) low.push({ course: c.key, courseName: c.name, subject: s.slug, usable });
    }
  }
  return low;
}

export { inArray };

/* ───────────────────────────── Review queue ───────────────────────────── */

export const REVIEW_PAGE_SIZE = 20;

export type ReviewFilters = { state: "pending" | "rejected"; syllabus?: string; source?: "ai" | "import"; flagged?: boolean; page?: number };

/**
 * Questions waiting for a decision. Not cached: student tests add to this queue in the background, and reviewers
 * expect to see them straight away.
 */
export async function listReviewQueue(f: ReviewFilters) {
  const page = Math.max(1, Math.floor(f.page ?? 1) || 1);
  const where = and(
    eq(bankQuestions.review, f.state),
    f.syllabus ? eq(bankQuestions.syllabusId, f.syllabus) : undefined,
    f.source ? eq(bankQuestions.source, f.source) : undefined,
    f.flagged ? sql`(${bankQuestions.aiCheck} ->> 'agrees') = 'false'` : undefined,
  );
  const rows = await db
    .select({
      id: bankQuestions.id,
      syllabusId: bankQuestions.syllabusId,
      subjectSlug: bankQuestions.subjectSlug,
      chapter: bankQuestions.chapter,
      topic: bankQuestions.topic,
      text: bankQuestions.text,
      options: bankQuestions.options,
      correctIndex: bankQuestions.correctIndex,
      explanation: bankQuestions.explanation,
      difficulty: bankQuestions.difficulty,
      source: bankQuestions.source,
      sourceNote: bankQuestions.sourceNote,
      aiCheck: bankQuestions.aiCheck,
      createdAt: bankQuestions.createdAt,
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(bankQuestions)
    .where(where)
    .orderBy(desc(bankQuestions.createdAt), asc(bankQuestions.id))
    .limit(REVIEW_PAGE_SIZE)
    .offset((page - 1) * REVIEW_PAGE_SIZE);
  const total = rows[0]?.total ?? (page > 1 ? (await db.select({ n: count() }).from(bankQuestions).where(where))[0].n : 0);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / REVIEW_PAGE_SIZE)) };
}

export type ReviewRow = Awaited<ReturnType<typeof listReviewQueue>>["rows"][number];

/** Pending / rejected totals for the tabs and the bank page's "Review" button. */
export async function reviewCounts() {
  const rows = await db
    .select({ review: bankQuestions.review, n: count() })
    .from(bankQuestions)
    .where(inArray(bankQuestions.review, ["pending", "rejected"]))
    .groupBy(bankQuestions.review);
  const get = (k: string) => rows.find((r) => r.review === k)?.n ?? 0;
  return { pending: get("pending"), rejected: get("rejected") };
}
