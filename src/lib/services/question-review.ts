import "server-only";
import { and, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { MODEL_LABEL, aiStatus } from "@/lib/ai/model";
import { checkAnswers, generateQuestions, questionKey } from "@/lib/ai/questions";
import { getCatalog } from "@/lib/catalog/server";
import { subjectName, type CourseSubject } from "@/lib/catalog/shared";
import { db } from "@/lib/db";
import { bankQuestions, type AiAnswerCheck } from "@/lib/db/schema";
import type { Difficulty, QuestionWithAnswer } from "@/lib/types";

/**
 * The review queue: questions written by the AI model (or taken from an open dataset) land here as `pending`.
 * Nothing pending is ever picked for a test — a staff member with `questions.manage` approves it first.
 */

type Candidate = QuestionWithAnswer & { syllabusId: string; aiCheck?: AiAnswerCheck | null };

/** Stems already in the bank (any review state) for these chapter lists, so the same question is never queued twice. */
async function existingKeys(syllabusIds: string[]) {
  if (!syllabusIds.length) return new Set<string>();
  const rows = await db.select({ text: bankQuestions.text }).from(bankQuestions).where(inArray(bankQuestions.syllabusId, syllabusIds));
  return new Set(rows.map((r) => questionKey(r.text)));
}

/** Inserts new candidates as `pending`; duplicates of anything already in the bank are skipped. Returns how many were added. */
export async function queueForReview(
  list: Candidate[],
  meta: { source: "ai" | "import"; sourceNote: string; createdBy?: string | null },
): Promise<{ added: number; skipped: number }> {
  if (!list.length) return { added: 0, skipped: 0 };
  const seen = await existingKeys([...new Set(list.map((q) => q.syllabusId))]);
  const fresh: Candidate[] = [];
  for (const q of list) {
    const key = questionKey(q.text);
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(q);
  }
  if (fresh.length) {
    await db.insert(bankQuestions).values(
      fresh.map((q) => ({
        syllabusId: q.syllabusId,
        subjectSlug: q.subject,
        chapter: q.chapter,
        topic: q.topic,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        difficulty: q.difficulty,
        active: true,
        source: meta.source,
        review: "pending" as const,
        sourceNote: meta.sourceNote,
        aiCheck: q.aiCheck ?? null,
        createdBy: meta.createdBy ?? null,
      })),
    );
  }
  return { added: fresh.length, skipped: list.length - fresh.length };
}

/**
 * Called after a student's test was built with AI questions: the same questions go to the review queue so that,
 * once approved, they serve every other student too. Runs in `after()` — never slows the test down.
 */
export async function queueTestQuestions(list: QuestionWithAnswer[], ts: CourseSubject) {
  if (!list.length) return;
  try {
    const cat = await getCatalog();
    const lists = ts.syllabusIds.map((id) => cat.syllabi.find((s) => s.id === id)).filter((s) => !!s);
    const candidates: Candidate[] = [];
    for (const q of list) {
      const home = lists.find((s) => s.chapters.some((c) => c.name === q.chapter));
      if (home) candidates.push({ ...q, syllabusId: home.id });
    }
    const { added } = await queueForReview(candidates, { source: "ai", sourceNote: `${MODEL_LABEL} · student test` });
    if (added) console.info(`[review] queued ${added} AI question(s) for review`);
  } catch (error) {
    console.error("[review] could not queue AI questions:", error instanceof Error ? error.message : error);
  }
}

export class ReviewError extends Error {}

/**
 * Staff asked the AI for questions on one chapter list. With no chapter chosen, the chapters with the fewest
 * questions (approved + pending) go first, so gaps fill up. Every answer is double-checked by a second AI pass.
 */
export async function generateForReview(opts: {
  syllabusId: string;
  chapter: string | null;
  count: number;
  difficulty: Difficulty | "adaptive";
  createdBy: string;
}) {
  const status = aiStatus();
  if (!status.available) throw new ReviewError(status.reason ? `${status.reason}. Try again later.` : "AI is not available right now.");

  const cat = await getCatalog();
  const syllabus = cat.syllabi.find((s) => s.id === opts.syllabusId);
  if (!syllabus) throw new ReviewError("Choose a chapter list.");
  if (!syllabus.chapters.length) throw new ReviewError("This chapter list has no chapters yet.");
  if (opts.chapter && !syllabus.chapters.some((c) => c.name === opts.chapter)) throw new ReviewError("Choose a chapter from this list.");

  // Audience and exam style come from a course that teaches this list (active courses first).
  const course =
    cat.courseConfigs.find((c) => c.active && c.subjects.some((s) => s.syllabusIds.includes(syllabus.id))) ??
    cat.courseConfigs.find((c) => c.subjects.some((s) => s.syllabusIds.includes(syllabus.id)));

  let chapters: string[];
  if (opts.chapter) {
    chapters = [opts.chapter];
  } else {
    const rows = await db
      .select({ chapter: bankQuestions.chapter, n: count() })
      .from(bankQuestions)
      .where(and(eq(bankQuestions.syllabusId, syllabus.id), ne(bankQuestions.review, "rejected")))
      .groupBy(bankQuestions.chapter);
    const have = new Map(rows.map((r) => [r.chapter, r.n]));
    chapters = [...syllabus.chapters]
      .map((c) => ({ name: c.name, n: have.get(c.name) ?? 0, r: Math.random() }))
      .sort((a, b) => a.n - b.n || a.r - b.r)
      .slice(0, Math.min(3, Math.max(1, Math.ceil(opts.count / 4))))
      .map((c) => c.name);
  }

  const existing = await db
    .select({ text: bankQuestions.text })
    .from(bankQuestions)
    .where(and(eq(bankQuestions.syllabusId, syllabus.id), inArray(bankQuestions.chapter, chapters)))
    .orderBy(desc(bankQuestions.createdAt))
    .limit(40);

  const name = subjectName(cat, syllabus.subjectSlug);
  const made = await generateQuestions({
    subject: syllabus.subjectSlug,
    subjectName: name,
    audience: course?.audience ?? `students following “${syllabus.title}”`,
    isExam: course?.isExam ?? false,
    count: opts.count,
    chapters,
    syllabus: syllabus.chapters.map((c) => c.name),
    difficulty: opts.difficulty,
    avoid: existing.map((e) => e.text),
  });
  if (!made.length) {
    const after = aiStatus();
    throw new ReviewError(after.reason ? `${after.reason}. Try again later.` : "The AI didn't return usable questions. Please try again.");
  }

  const checks = await checkAnswers(made.map((q) => ({ text: q.text, options: q.options, correctIndex: q.correctIndex, subjectName: name })));
  const result = await queueForReview(
    made.map((q, i) => ({ ...q, syllabusId: syllabus.id, aiCheck: checks[i] })),
    { source: "ai", sourceNote: MODEL_LABEL, createdBy: opts.createdBy },
  );
  return { ...result, chapters, syllabusTitle: syllabus.title, subjectName: name };
}

/** Re-runs the independent answer check for some queued questions (e.g. ones a student test sent in). */
export async function recheckQuestions(ids: string[]) {
  const status = aiStatus();
  if (!status.available) throw new ReviewError(status.reason ? `${status.reason}. Try again later.` : "AI is not available right now.");
  const [rows, cat] = await Promise.all([
    db
      .select({ id: bankQuestions.id, subjectSlug: bankQuestions.subjectSlug, text: bankQuestions.text, options: bankQuestions.options, correctIndex: bankQuestions.correctIndex })
      .from(bankQuestions)
      .where(inArray(bankQuestions.id, ids)),
    getCatalog(),
  ]);
  if (!rows.length) return 0;
  const checks = await checkAnswers(rows.map((r) => ({ text: r.text, options: r.options, correctIndex: r.correctIndex, subjectName: subjectName(cat, r.subjectSlug) })));
  const done = rows.flatMap((r, i) => (checks[i] ? [{ id: r.id, check: checks[i] }] : []));
  if (!done.length) throw new ReviewError(aiStatus().reason ?? "The AI couldn't check these right now. Please try again.");
  // One statement for the whole page instead of a round trip per question.
  await db.execute(sql`update ${bankQuestions} set ai_check = v.chk::jsonb
    from (values ${sql.join(done.map((d) => sql`(${d.id}, ${JSON.stringify(d.check)})`), sql`, `)}) as v(id, chk)
    where ${bankQuestions.id} = v.id`);
  return done.length;
}
