"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateAttemptFeedback } from "@/lib/ai/reports";
import { subjectName } from "@/lib/catalog/server";
import { db } from "@/lib/db";
import { answers, attempts, questions, type AttemptFeedback } from "@/lib/db/schema";
import { limitMessage, rateLimit } from "@/lib/rate-limit";
import { TestError, createPracticeTest, prepareDailyTest, prepareSundayTest, startAttempt } from "@/lib/services/tests";
import { requireLearner, requireUser } from "@/lib/session";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(error: unknown): { ok: false; error: string } {
  if (error instanceof TestError) return { ok: false, error: error.message };
  console.error(error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function startDailyTestAction(subject: string): Promise<Result<{ testId: string }>> {
  const { user, config } = await requireLearner();
  try {
    const testId = await prepareDailyTest(user.id, config, subject);
    revalidatePath("/dashboard");
    revalidatePath("/tests");
    return { ok: true, data: { testId } };
  } catch (error) {
    return fail(error);
  }
}

export async function startSundayTestAction(): Promise<Result<{ testId: string }>> {
  const { user, config } = await requireLearner();
  try {
    const testId = await prepareSundayTest(user.id, config);
    revalidatePath("/dashboard");
    revalidatePath("/tests");
    return { ok: true, data: { testId } };
  } catch (error) {
    return fail(error);
  }
}

const practiceSchema = z.object({
  subject: z.string().min(1).max(40),
  chapter: z.string().max(200).nullable(),
  difficulty: z.enum(["easy", "medium", "hard", "adaptive"]),
  count: z.number().int().min(5).max(20),
  timed: z.boolean(),
});

export async function createPracticeAction(input: z.input<typeof practiceSchema>): Promise<Result<{ testId: string }>> {
  const { user, config } = await requireLearner();
  const parsed = practiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check your practice settings." };
  const limited = rateLimit(`practice:${user.id}`, 12, 60 * 60_000);
  if (!limited.ok) return { ok: false, error: limitMessage(limited.retryAfterSec) };
  try {
    const testId = await createPracticeTest(user.id, config, parsed.data);
    revalidatePath("/practice");
    return { ok: true, data: { testId } };
  } catch (error) {
    return fail(error);
  }
}

export async function beginAttemptAction(testId: string): Promise<Result<{ attemptId: string; startedAt: string; serverNow: number }>> {
  const user = await requireUser();
  try {
    const attempt = await startAttempt(user.id, testId);
    if (attempt.status === "completed") return { ok: false, error: "You've already completed this test." };
    return { ok: true, data: { attemptId: attempt.id, startedAt: attempt.startedAt.toISOString(), serverNow: Date.now() } };
  } catch (error) {
    return fail(error);
  }
}

export async function requestFeedbackAction(attemptId: string): Promise<Result<AttemptFeedback>> {
  const { user, config } = await requireLearner();
  const attempt = await db.query.attempts.findFirst({
    where: and(eq(attempts.id, attemptId), eq(attempts.userId, user.id)),
    with: { test: true },
  });
  if (!attempt || attempt.status !== "completed") return { ok: false, error: "Result not found." };
  if (attempt.feedback) return { ok: true, data: attempt.feedback };
  const limited = rateLimit(`feedback:${user.id}`, 30, 60 * 60_000);
  if (!limited.ok) return { ok: false, error: limitMessage(limited.retryAfterSec) };

  const rows = await db
    .select({
      text: questions.text,
      options: questions.options,
      correctIndex: questions.correctIndex,
      chapter: questions.chapter,
      topic: questions.topic,
      selectedIndex: answers.selectedIndex,
      isCorrect: answers.isCorrect,
    })
    .from(questions)
    .leftJoin(answers, and(eq(answers.questionId, questions.id), eq(answers.attemptId, attempt.id)))
    .where(eq(questions.testId, attempt.testId))
    .orderBy(asc(questions.position));

  const feedback = await generateAttemptFeedback({
    subjectName: attempt.test.subject === "mixed" ? attempt.test.title : await subjectName(attempt.test.subject),
    audience: config.audience,
    score: attempt.score ?? 0,
    correct: attempt.correct,
    wrong: attempt.wrong,
    skipped: attempt.skipped,
    timeTakenSec: attempt.timeTakenSec ?? 0,
    durationSec: attempt.test.durationSec,
    rightTopics: [...new Set(rows.filter((r) => r.isCorrect).map((r) => r.topic))].slice(0, 8),
    mistakes: rows
      .filter((r) => !r.isCorrect)
      .slice(0, 10)
      .map((r) => ({
        topic: r.topic,
        chapter: r.chapter,
        question: r.text.slice(0, 220),
        chosen: r.selectedIndex === null || r.selectedIndex === undefined ? null : r.options[r.selectedIndex],
        correct: r.options[r.correctIndex],
      })),
  });
  await db.update(attempts).set({ feedback }).where(eq(attempts.id, attempt.id));
  return { ok: true, data: feedback };
}
