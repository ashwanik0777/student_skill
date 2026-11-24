import "server-only";
import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { after } from "next/server";
import { generateQuestions } from "@/lib/ai/questions";
import { getBankPool, subjectName, type BankPoolQuestion } from "@/lib/catalog/server";
import type { CourseConfig, CourseSubject } from "@/lib/catalog/shared";
import { db } from "@/lib/db";
import { answers, attempts, questions, tests, userStats } from "@/lib/db/schema";
import { computeXp, nextStreak } from "@/lib/gamification";
import type { Difficulty, EndReason, PublicQuestion, QuestionWithAnswer, TestKind } from "@/lib/types";
import { addDays, clamp, dayKey, shuffle, weekdayIST } from "@/lib/utils";
import { awardBadges, type BadgeTrack } from "./badges";
import { queueTestQuestions } from "./question-review";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type BuiltQuestion = QuestionWithAnswer & { bankId?: string };

export class TestError extends Error {}

type TrackConfig = CourseConfig;
type TrackSubject = CourseSubject;

function getTrackSubject(config: CourseConfig, slug: string) {
  return config.subjects.find((s) => s.slug === slug);
}

/* ───────────────────────── Personalisation ───────────────────────── */

async function chapterAccuracy(userId: string, trackKey: string, subject: string) {
  const rows = await db
    .select({
      chapter: answers.chapter,
      total: sql<number>`count(*)::int`,
      correct: sql<number>`sum(case when ${answers.isCorrect} then 1 else 0 end)::int`,
    })
    .from(answers)
    .where(and(eq(answers.userId, userId), eq(answers.trackKey, trackKey), eq(answers.subject, subject)))
    .groupBy(answers.chapter);
  return new Map(rows.map((r) => [r.chapter, r.total ? r.correct / r.total : 0]));
}

export async function weakTopics(userId: string, opts: { trackKey?: string; subject?: string } = {}, limit = 6) {
  const where = [eq(answers.userId, userId)];
  if (opts.trackKey) where.push(eq(answers.trackKey, opts.trackKey));
  if (opts.subject) where.push(eq(answers.subject, opts.subject));
  const rows = await db
    .select({
      topic: answers.topic,
      chapter: answers.chapter,
      subject: answers.subject,
      total: sql<number>`count(*)::int`,
      correct: sql<number>`sum(case when ${answers.isCorrect} then 1 else 0 end)::int`,
    })
    .from(answers)
    .where(and(...where))
    .groupBy(answers.topic, answers.chapter, answers.subject)
    .having(sql`count(*) >= 2`)
    .orderBy(sql`sum(case when ${answers.isCorrect} then 1 else 0 end)::float / count(*) asc`)
    .limit(limit);
  return rows.filter((r) => r.correct / r.total < 0.6);
}

/** Weighted pick of chapters: untested and weak chapters are more likely to appear. */
async function planChapters(userId: string, config: TrackConfig, ts: TrackSubject, n: number, units?: string[]) {
  const syllabus = ts.chapters.filter((c) => !units || units.includes(c.unit)).map((c) => c.name);
  const acc = await chapterAccuracy(userId, config.key, ts.slug);
  const pool = syllabus.map((name) => ({ name, weight: acc.has(name) ? 1 + (1 - acc.get(name)!) * 2.5 : 2.2 }));
  const picked: string[] = [];
  while (picked.length < Math.min(n, pool.length)) {
    const total = pool.reduce((s, c) => s + c.weight, 0);
    let r = Math.random() * total;
    const idx = pool.findIndex((c) => (r -= c.weight) <= 0);
    picked.push(pool.splice(idx === -1 ? 0 : idx, 1)[0].name);
  }
  return picked;
}

async function seenBankIds(userId: string) {
  const rows = await db
    .selectDistinct({ bankId: questions.bankId })
    .from(questions)
    .innerJoin(tests, eq(tests.id, questions.testId))
    .where(and(eq(tests.userId, userId), isNotNull(questions.bankId)));
  return new Set(rows.map((r) => r.bankId!));
}

async function pickFromBank(opts: {
  ts: TrackSubject;
  count: number;
  chapters: string[];
  units?: string[];
  seen: Set<string>;
  exclude: Set<string>;
  difficulty: Difficulty | "adaptive";
}): Promise<BuiltQuestion[]> {
  const allowed = new Set(opts.ts.chapters.filter((c) => !opts.units || opts.units.includes(c.unit)).map((c) => c.name));
  const pools = [...new Set([...opts.ts.syllabusIds, ...opts.ts.borrowIds])];
  const inScope = (await getBankPool(pools, opts.ts.slug)).filter((q) => !opts.exclude.has(q.text.toLowerCase().slice(0, 80)));
  let pool = inScope.filter((q) => allowed.has(q.chapter));
  // Non-language subjects may borrow same-subject questions when the syllabus slice has too few.
  if (pool.length < opts.count && !opts.ts.strict && !opts.units) {
    pool = [...pool, ...inScope.filter((q) => !allowed.has(q.chapter))];
  }
  const preferred = new Set(opts.chapters);
  const ranked = shuffle(pool).sort((a, b) => {
    const score = (q: BankPoolQuestion) =>
      (opts.seen.has(q.id) ? 4 : 0) +
      (preferred.has(q.chapter) ? 0 : 1) +
      (opts.difficulty !== "adaptive" && q.difficulty !== opts.difficulty ? 1 : 0) +
      (allowed.has(q.chapter) ? 0 : 6);
    return score(a) - score(b);
  });
  return ranked.slice(0, opts.count).map((q) => {
    const correctText = q.options[q.correctIndex];
    const options = shuffle([...q.options]);
    return {
      subject: opts.ts.slug,
      chapter: q.chapter,
      topic: q.topic,
      text: q.text,
      options,
      correctIndex: options.indexOf(correctText),
      explanation: q.explanation,
      difficulty: q.difficulty,
      bankId: q.id,
    };
  });
}

async function buildQuestions(
  userId: string,
  config: TrackConfig,
  spec: { ts: TrackSubject; count: number; chapters: string[]; difficulty: Difficulty | "adaptive"; units?: string[] },
  seen: Set<string>,
): Promise<{ list: BuiltQuestion[]; ai: number }> {
  const weak = await weakTopics(userId, { trackKey: config.key, subject: spec.ts.slug }, 5);
  const ai = await generateQuestions({
    subject: spec.ts.slug,
    subjectName: await subjectName(spec.ts.slug),
    audience: config.audience,
    isExam: config.isExam,
    count: spec.count,
    chapters: spec.chapters,
    syllabus: spec.ts.chapters.map((c) => c.name),
    difficulty: spec.difficulty,
    weakTopics: weak.map((w) => `${w.topic} (${w.chapter})`),
  });
  const list: BuiltQuestion[] = [...ai];
  // AI questions also go to the admin review queue; once approved they join the bank for everyone.
  if (ai.length) after(() => queueTestQuestions(ai, spec.ts));
  if (list.length < spec.count) {
    const exclude = new Set(list.map((q) => q.text.toLowerCase().slice(0, 80)));
    list.push(...(await pickFromBank({ ...spec, count: spec.count - list.length, seen, exclude })));
  }
  return { list, ai: ai.length };
}

const NOT_ENOUGH =
  "We couldn't prepare enough questions for this right now. Our AI question writer is temporarily unavailable — please try again in a little while.";

/* ───────────────────────── Creating tests ───────────────────────── */

async function insertTest(
  tx: Tx,
  values: {
    userId: string;
    trackKey: string;
    kind: TestKind;
    subject: string;
    chapter?: string | null;
    title: string;
    dayKey?: string | null;
    durationSec: number;
    difficulty: Difficulty | "adaptive";
    strict: boolean;
  },
  list: BuiltQuestion[],
  aiCount: number,
) {
  const source = aiCount === 0 ? "bank" : aiCount === list.length ? "ai" : "mixed";
  const [test] = await tx
    .insert(tests)
    .values({ ...values, questionCount: list.length, source })
    .returning({ id: tests.id });
  await tx.insert(questions).values(
    list.map((q, i) => ({
      testId: test.id,
      position: i,
      subject: q.subject,
      chapter: q.chapter,
      topic: q.topic,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      difficulty: q.difficulty,
      bankId: q.bankId ?? null,
    })),
  );
  return test.id;
}

function isUniqueViolation(error: unknown) {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

async function findDayTest(userId: string, trackKey: string, kind: "daily" | "sunday", subject: string, day: string) {
  const row = await db.query.tests.findFirst({
    where: and(eq(tests.userId, userId), eq(tests.trackKey, trackKey), eq(tests.kind, kind), eq(tests.subject, subject), eq(tests.dayKey, day)),
    columns: { id: true },
  });
  return row?.id ?? null;
}

export async function prepareDailyTest(userId: string, config: TrackConfig, subject: string): Promise<string> {
  const ts = getTrackSubject(config, subject);
  if (!ts) throw new TestError("This subject isn't part of your course.");
  const day = dayKey();
  const existing = await findDayTest(userId, config.key, "daily", subject, day);
  if (existing) return existing;

  const seen = await seenBankIds(userId);
  const chapters = await planChapters(userId, config, ts, 4);
  const { list, ai } = await buildQuestions(userId, config, { ts, count: config.daily.questions, chapters, difficulty: "adaptive" }, seen);
  if (list.length < 5) throw new TestError(NOT_ENOUGH);

  const title = `${await subjectName(subject)} Daily Test`;
  try {
    return await db.transaction((tx) =>
      insertTest(
        tx,
        {
          userId,
          trackKey: config.key,
          kind: "daily",
          subject,
          title,
          dayKey: day,
          durationSec: config.daily.durationSec,
          difficulty: "adaptive",
          strict: true,
        },
        list,
        ai,
      ),
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      const id = await findDayTest(userId, config.key, "daily", subject, day);
      if (id) return id;
    }
    throw error;
  }
}

export async function prepareSundayTest(userId: string, config: TrackConfig): Promise<string> {
  if (weekdayIST() !== 0) throw new TestError("The Sunday test unlocks every Sunday.");
  const day = dayKey();
  const existing = await findDayTest(userId, config.key, "sunday", "mixed", day);
  if (existing) return existing;

  const seen = await seenBankIds(userId);
  const parts = await Promise.all(
    config.weekly.parts.map(async (part) => {
      const ts = getTrackSubject(config, part.subject);
      if (!ts) return { list: [], ai: 0 };
      const chapters = await planChapters(userId, config, ts, 3, part.units);
      return buildQuestions(userId, config, { ts, count: part.count, chapters, difficulty: "adaptive", units: part.units }, seen);
    }),
  );
  const list = parts.flatMap((p) => p.list);
  const ai = parts.reduce((s, p) => s + p.ai, 0);
  if (list.length < 8) throw new TestError(NOT_ENOUGH);

  try {
    return await db.transaction((tx) =>
      insertTest(
        tx,
        {
          userId,
          trackKey: config.key,
          kind: "sunday",
          subject: "mixed",
          title: config.weekly.title,
          dayKey: day,
          durationSec: config.weekly.durationSec,
          difficulty: "adaptive",
          strict: true,
        },
        list,
        ai,
      ),
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      const id = await findDayTest(userId, config.key, "sunday", "mixed", day);
      if (id) return id;
    }
    throw error;
  }
}

export async function createPracticeTest(
  userId: string,
  config: TrackConfig,
  opts: { subject: string; chapter: string | null; difficulty: Difficulty | "adaptive"; count: number; timed: boolean },
): Promise<string> {
  const ts = getTrackSubject(config, opts.subject);
  if (!ts) throw new TestError("This subject isn't part of your course.");
  const count = clamp(Math.round(opts.count), 5, 20);
  const chapter = opts.chapter && ts.chapters.some((c) => c.name === opts.chapter) ? opts.chapter : null;
  const chapters = chapter ? [chapter] : await planChapters(userId, config, ts, 3);
  const seen = await seenBankIds(userId);
  const { list, ai } = await buildQuestions(userId, config, { ts, count, chapters, difficulty: opts.difficulty }, seen);
  if (list.length === 0) throw new TestError(NOT_ENOUGH);

  return db.transaction(async (tx) => {
    const testId = await insertTest(
      tx,
      {
        userId,
        trackKey: config.key,
        kind: "practice",
        subject: opts.subject,
        chapter,
        title: chapter ? `Practice · ${chapter}` : `${await subjectName(opts.subject)} Practice`,
        durationSec: opts.timed ? Math.ceil((list.length * 75) / 60) * 60 : 0,
        difficulty: opts.difficulty,
        strict: false,
      },
      list,
      ai,
    );
    await tx
      .insert(userStats)
      .values({ userId, practiceGenerated: 1 })
      .onConflictDoUpdate({ target: userStats.userId, set: { practiceGenerated: sql`${userStats.practiceGenerated} + 1` } });
    await awardBadges(tx, userId, { track: { key: config.key, subjectCount: config.subjects.length } });
    return testId;
  });
}

/* ───────────────────────── Today ───────────────────────── */

export type TodayItem = {
  key: string;
  kind: "daily" | "sunday";
  subject: string;
  title: string;
  questionCount: number;
  durationSec: number;
  status: "new" | "ready" | "in_progress" | "completed";
  testId: string | null;
  attemptId: string | null;
  score: number | null;
};

export async function getTodayTests(userId: string, config: TrackConfig) {
  const day = dayKey();
  const isSunday = weekdayIST() === 0;
  const rows = await db
    .select({
      id: tests.id,
      kind: tests.kind,
      subject: tests.subject,
      questionCount: tests.questionCount,
      attemptId: attempts.id,
      status: attempts.status,
      score: attempts.score,
    })
    .from(tests)
    .leftJoin(attempts, eq(attempts.testId, tests.id))
    .where(and(eq(tests.userId, userId), eq(tests.trackKey, config.key), eq(tests.dayKey, day)));

  const find = (kind: string, subject: string) => rows.find((r) => r.kind === kind && r.subject === subject);
  const toItem = (kind: "daily" | "sunday", subject: string, title: string, base: { questions: number; durationSec: number }): TodayItem => {
    const r = find(kind, subject);
    return {
      key: `${kind}-${subject}`,
      kind,
      subject,
      title,
      questionCount: r?.questionCount ?? base.questions,
      durationSec: base.durationSec,
      status: !r ? "new" : r.status === "completed" ? "completed" : r.status === "in_progress" ? "in_progress" : "ready",
      testId: r?.id ?? null,
      attemptId: r?.attemptId ?? null,
      score: r?.score ?? null,
    };
  };

  const names = await Promise.all(config.subjects.map((s) => subjectName(s.slug)));
  const items = config.subjects.map((s, i) => toItem("daily", s.slug, names[i], config.daily));
  const sunday = isSunday ? toItem("sunday", "mixed", config.weekly.title, config.weekly) : null;
  return {
    day,
    isSunday,
    items,
    sunday,
    weekly: config.weekly,
    completed: items.filter((i) => i.status === "completed").length,
  };
}

/* ───────────────────────── Exam ───────────────────────── */

/** Test, questions and attempt in one parallel round trip; nothing is returned unless the test is this user's. */
export async function getExamData(userId: string, testId: string) {
  const [test, qs, attempt] = await Promise.all([
    db.query.tests.findFirst({ where: and(eq(tests.id, testId), eq(tests.userId, userId)) }),
    db
      .select({
        id: questions.id,
        position: questions.position,
        subject: questions.subject,
        chapter: questions.chapter,
        topic: questions.topic,
        text: questions.text,
        options: questions.options,
      })
      .from(questions)
      .where(eq(questions.testId, testId))
      .orderBy(asc(questions.position)),
    db.query.attempts.findFirst({ where: and(eq(attempts.testId, testId), eq(attempts.userId, userId)) }),
  ]);
  if (!test) return null;
  return { test, questions: qs as PublicQuestion[], attempt: attempt ?? null, serverNow: Date.now() };
}

export async function startAttempt(userId: string, testId: string) {
  const [test, existing] = await Promise.all([
    db.query.tests.findFirst({ where: and(eq(tests.id, testId), eq(tests.userId, userId)) }),
    db.query.attempts.findFirst({ where: and(eq(attempts.testId, testId), eq(attempts.userId, userId)) }),
  ]);
  if (!test) throw new TestError("Test not found.");
  if (existing) return existing;
  try {
    const [row] = await db.insert(attempts).values({ testId, userId, total: test.questionCount }).returning();
    return row;
  } catch (error) {
    if (isUniqueViolation(error)) {
      const row = await db.query.attempts.findFirst({ where: eq(attempts.testId, testId) });
      if (row) return row;
    }
    throw error;
  }
}

export type SubmitInput = {
  answers: { questionId: string; selectedIndex: number | null; timeSpentSec?: number }[];
  endReason: EndReason;
  /** Only for offline sync. */
  clientStartedAt?: string;
  clientCompletedAt?: string;
};

/**
 * Grades and stores a finished attempt in three round trips (it used to take ~20):
 *  1. read the attempt + test + questions and the student's stats, in parallel;
 *  2. one atomic statement that completes the attempt, saves the answers and bumps the stats — the status guard
 *     makes a double submit (two tabs, beacon + fetch, offline re-sync) a no-op instead of counting twice;
 *  3. one query for every badge rule (plus one write only if a badge was earned).
 */
export async function submitAttempt(userId: string, attemptId: string, input: SubmitInput, badgeTrack?: BadgeTrack | null) {
  const [attempt, stats] = await Promise.all([
    db.query.attempts.findFirst({
      where: and(eq(attempts.id, attemptId), eq(attempts.userId, userId)),
      with: { test: { with: { questions: { orderBy: [asc(questions.position)] } } } },
    }),
    db.query.userStats.findFirst({ where: eq(userStats.userId, userId) }),
  ]);
  if (!attempt) throw new TestError("Attempt not found.");
  if (attempt.status === "completed") return { attemptId, alreadyCompleted: true };
  const { test } = attempt;
  const qs = test.questions;

  const given = new Map(input.answers.map((a) => [a.questionId, a]));
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  const rows = qs.map((q) => {
    const a = given.get(q.id);
    const sel =
      a && typeof a.selectedIndex === "number" && Number.isInteger(a.selectedIndex) && a.selectedIndex >= 0 && a.selectedIndex < q.options.length
        ? a.selectedIndex
        : null;
    const isCorrect = sel !== null && sel === q.correctIndex;
    if (sel === null) skipped++;
    else if (isCorrect) correct++;
    else wrong++;
    return { q, sel, isCorrect, timeSpentSec: clamp(Math.round(a?.timeSpentSec ?? 0), 0, 3600) };
  });

  const now = new Date();
  const total = qs.length;
  const score = total ? Math.round((correct / total) * 100) : 0;
  const cap = test.durationSec > 0 ? test.durationSec + 5 : 3 * 3600;
  let timeTaken = (now.getTime() - attempt.startedAt.getTime()) / 1000;
  if (input.endReason === "offline" && input.clientStartedAt && input.clientCompletedAt) {
    timeTaken = (new Date(input.clientCompletedAt).getTime() - new Date(input.clientStartedAt).getTime()) / 1000;
  }
  timeTaken = clamp(Math.round(timeTaken), 0, cap);

  // Stats + streak are shared across every track, so progress carries over when a student moves up.
  const today = dayKey(now);
  const { streak, increased } = nextStreak(stats?.lastActiveDay ?? null, today, addDays(today, -1), stats?.currentStreak ?? 0);
  const xp = computeXp({ kind: test.kind, correct, total, score, endReason: input.endReason, streakIncreased: increased, newStreak: streak });

  const saveAnswers = rows.length
    ? sql`insert into ${answers} (id, attempt_id, question_id, user_id, track_key, subject, chapter, topic, selected_index, is_correct, time_spent_sec)
        select v.* from (values ${sql.join(
          rows.map(
            (r) =>
              sql`(${crypto.randomUUID()}, ${attemptId}, ${r.q.id}, ${userId}, ${test.trackKey}, ${r.q.subject}, ${r.q.chapter}, ${r.q.topic}, ${r.sel}::int, ${r.isCorrect}::boolean, ${r.timeSpentSec}::int)`,
          ),
          sql`, `,
        )}) as v(id, attempt_id, question_id, user_id, track_key, subject, chapter, topic, selected_index, is_correct, time_spent_sec)
        where exists (select 1 from done)
        on conflict do nothing`
    : sql`select 1`;

  const result = await db.execute<{ done: number }>(sql`
    with done as (
      update ${attempts}
      set status = 'completed', completed_at = ${now}, time_taken_sec = ${timeTaken}, correct = ${correct}, wrong = ${wrong},
          skipped = ${skipped}, total = ${total}, score = ${score}, xp_earned = ${xp}, end_reason = ${input.endReason}
      where id = ${attemptId} and user_id = ${userId} and status = 'in_progress'
      returning id
    ), saved as (
      ${saveAnswers}
    ), bumped as (
      insert into ${userStats} (user_id, xp, tests_completed, questions_answered, correct_answers, current_streak, longest_streak, last_active_day)
      select ${userId}, ${xp}::int, 1, ${correct + wrong}::int, ${correct}::int, ${streak}::int, ${streak}::int, ${today}
      where exists (select 1 from done)
      on conflict (user_id) do update set
        xp = ${userStats}.xp + excluded.xp,
        tests_completed = ${userStats}.tests_completed + 1,
        questions_answered = ${userStats}.questions_answered + excluded.questions_answered,
        correct_answers = ${userStats}.correct_answers + excluded.correct_answers,
        current_streak = excluded.current_streak,
        longest_streak = greatest(${userStats}.longest_streak, excluded.current_streak),
        last_active_day = excluded.last_active_day,
        updated_at = now()
    )
    select count(*)::int as done from done`);
  if (!result.rows[0]?.done) return { attemptId, alreadyCompleted: true };

  await awardBadges(db, userId, {
    attempt: { kind: test.kind, subject: test.subject, score, total, endReason: input.endReason },
    track: badgeTrack,
    attemptId,
  });
  return { attemptId, alreadyCompleted: false };
}

/* ───────────────────────── Results & history ───────────────────────── */

/** Attempt + test and the graded questions in one parallel round trip (ownership is checked in both queries). */
export async function getAttemptResult(userId: string, attemptId: string) {
  const [attempt, rows] = await Promise.all([
    db.query.attempts.findFirst({
      where: and(eq(attempts.id, attemptId), eq(attempts.userId, userId)),
      with: { test: true },
    }),
    db
    .select({
      id: questions.id,
      position: questions.position,
      subject: questions.subject,
      chapter: questions.chapter,
      topic: questions.topic,
      text: questions.text,
      options: questions.options,
      correctIndex: questions.correctIndex,
      explanation: questions.explanation,
      difficulty: questions.difficulty,
      selectedIndex: answers.selectedIndex,
      isCorrect: answers.isCorrect,
      timeSpentSec: answers.timeSpentSec,
    })
    .from(questions)
    .leftJoin(answers, and(eq(answers.questionId, questions.id), eq(answers.attemptId, attemptId)))
    .where(sql`${questions.testId} = (select test_id from ${attempts} where id = ${attemptId} and user_id = ${userId})`)
    .orderBy(asc(questions.position)),
  ]);
  if (!attempt) return null;
  return { attempt, test: attempt.test, questions: rows };
}

export async function listAttempts(
  userId: string,
  opts: { kind?: TestKind; subject?: string; trackKey?: string; limit?: number; offset?: number } = {},
) {
  const where = [eq(attempts.userId, userId), eq(attempts.status, "completed")];
  if (opts.kind) where.push(eq(tests.kind, opts.kind));
  if (opts.subject) where.push(eq(tests.subject, opts.subject));
  if (opts.trackKey) where.push(eq(tests.trackKey, opts.trackKey));
  return db
    .select({
      attemptId: attempts.id,
      testId: tests.id,
      title: tests.title,
      kind: tests.kind,
      trackKey: tests.trackKey,
      subject: tests.subject,
      chapter: tests.chapter,
      score: attempts.score,
      correct: attempts.correct,
      total: attempts.total,
      xpEarned: attempts.xpEarned,
      timeTakenSec: attempts.timeTakenSec,
      endReason: attempts.endReason,
      completedAt: attempts.completedAt,
    })
    .from(attempts)
    .innerJoin(tests, eq(tests.id, attempts.testId))
    .where(and(...where))
    .orderBy(desc(attempts.completedAt))
    .limit(opts.limit ?? 20)
    .offset(opts.offset ?? 0);
}

export async function listPendingPractice(userId: string, trackKey: string, limit = 6) {
  return db
    .select({
      testId: tests.id,
      title: tests.title,
      subject: tests.subject,
      questionCount: tests.questionCount,
      durationSec: tests.durationSec,
      createdAt: tests.createdAt,
      attemptStatus: attempts.status,
    })
    .from(tests)
    .leftJoin(attempts, eq(attempts.testId, tests.id))
    .where(
      and(
        eq(tests.userId, userId),
        eq(tests.trackKey, trackKey),
        eq(tests.kind, "practice"),
        sql`(${attempts.status} is null or ${attempts.status} = 'in_progress')`,
      ),
    )
    .orderBy(desc(tests.createdAt))
    .limit(limit);
}

/** Questions without answers, for taking a test offline. */
export async function getOfflinePackage(userId: string, testId: string) {
  const data = await getExamData(userId, testId);
  if (!data || data.attempt?.status === "completed") return null;
  return {
    id: data.test.id,
    title: data.test.title,
    kind: data.test.kind,
    subject: data.test.subject,
    durationSec: data.test.durationSec,
    questions: data.questions,
    downloadedAt: new Date().toISOString(),
  };
}
