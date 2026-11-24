import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { cache } from "react";
import { getCatalog } from "@/lib/catalog/server";
import { subjectName, type CourseConfig } from "@/lib/catalog/shared";
import { db } from "@/lib/db";
import { aiReports, answers, attempts, tests, userStats, user, type InsightsReport, type StudyPlanReport } from "@/lib/db/schema";
import { levelInfo } from "@/lib/gamification";
import { IST, addDays, dayKey, startOfWeekIST } from "@/lib/utils";


/**
 * XP, streak and accuracy are global — they carry over when a student moves up a class.
 * Wrapped in React `cache`: the sidebar, top bar, drawer and page each ask for it in the same request.
 */
export const getStats = cache(async (userId: string) => {
  const [row] = await db.select().from(userStats).where(eq(userStats.userId, userId));
  const stats = row ?? {
    userId,
    xp: 0,
    testsCompleted: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDay: null,
    practiceGenerated: 0,
    updatedAt: new Date(),
  };
  // A streak only counts if the student was active today or yesterday.
  const today = dayKey();
  const alive = stats.lastActiveDay === today || stats.lastActiveDay === addDays(today, -1);
  return {
    ...stats,
    currentStreak: alive ? stats.currentStreak : 0,
    activeToday: stats.lastActiveDay === today,
    accuracy: stats.questionsAnswered ? Math.round((stats.correctAnswers / stats.questionsAnswered) * 100) : 0,
    level: levelInfo(stats.xp),
  };
});

export type Stats = Awaited<ReturnType<typeof getStats>>;

export async function getSubjectPerformance(userId: string, config: CourseConfig) {
  const [cat, testRows, answerRows] = await Promise.all([
    getCatalog(),
    db
      .select({
        subject: tests.subject,
        tests: sql<number>`count(*)::int`,
        avgScore: sql<number>`coalesce(round(avg(${attempts.score})), 0)::int`,
        best: sql<number>`coalesce(max(${attempts.score}), 0)::int`,
        last: sql<Date | null>`max(${attempts.completedAt})`.mapWith(attempts.completedAt),
      })
      .from(attempts)
      .innerJoin(tests, eq(tests.id, attempts.testId))
      .where(and(eq(attempts.userId, userId), eq(attempts.status, "completed"), eq(tests.trackKey, config.key)))
      .groupBy(tests.subject),
    db
      .select({
        subject: answers.subject,
        total: sql<number>`count(*)::int`,
        correct: sql<number>`sum(case when ${answers.isCorrect} then 1 else 0 end)::int`,
      })
      .from(answers)
      .where(and(eq(answers.userId, userId), eq(answers.trackKey, config.key)))
      .groupBy(answers.subject),
  ]);
  return config.subjects.map((s) => {
    const t = testRows.find((r) => r.subject === s.slug);
    const a = answerRows.find((r) => r.subject === s.slug);
    return {
      subject: s.slug,
      name: subjectName(cat, s.slug),
      tests: t?.tests ?? 0,
      avgScore: t?.avgScore ?? 0,
      best: t?.best ?? 0,
      accuracy: a && a.total ? Math.round((a.correct / a.total) * 100) : 0,
      answered: a?.total ?? 0,
      last: t?.last ?? null,
    };
  });
}

export async function getChapterAccuracy(userId: string, trackKey: string) {
  const rows = await db
    .select({
      subject: answers.subject,
      chapter: answers.chapter,
      total: sql<number>`count(*)::int`,
      correct: sql<number>`sum(case when ${answers.isCorrect} then 1 else 0 end)::int`,
    })
    .from(answers)
    .where(and(eq(answers.userId, userId), eq(answers.trackKey, trackKey)))
    .groupBy(answers.subject, answers.chapter);
  return rows.map((r) => ({ ...r, accuracy: Math.round((r.correct / r.total) * 100) }));
}

export async function getTopics(userId: string, trackKey: string) {
  const chapters = await getChapterAccuracy(userId, trackKey);
  const eligible = chapters.filter((c) => c.total >= 2);
  const weak = [...eligible].sort((a, b) => a.accuracy - b.accuracy || b.total - a.total).filter((c) => c.accuracy < 70).slice(0, 6);
  const strong = [...eligible].sort((a, b) => b.accuracy - a.accuracy || b.total - a.total).filter((c) => c.accuracy >= 70).slice(0, 6);
  return { weak, strong, all: chapters };
}

export async function getScoreTrend(userId: string, trackKey: string, limit = 20) {
  const [cat, rows] = await Promise.all([
    getCatalog(),
    db
    .select({
      score: attempts.score,
      completedAt: attempts.completedAt,
      subject: tests.subject,
      kind: tests.kind,
    })
    .from(attempts)
    .innerJoin(tests, eq(tests.id, attempts.testId))
    .where(and(eq(attempts.userId, userId), eq(attempts.status, "completed"), eq(tests.trackKey, trackKey)))
    .orderBy(desc(attempts.completedAt))
    .limit(limit),
  ]);
  return rows.reverse().map((r, i) => ({
    index: i + 1,
    score: r.score ?? 0,
    subject: r.subject,
    subjectName: subjectName(cat, r.subject),
    kind: r.kind,
    date: r.completedAt!.toISOString(),
  }));
}

/** Completed tests per IST day for the last `days` days (oldest first). */
export async function getActivity(userId: string, days = 35) {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db
    .select({
      day: sql<string>`to_char(${attempts.completedAt} at time zone ${sql.raw(`'${IST}'`)}, 'YYYY-MM-DD')`,
      n: sql<number>`count(*)::int`,
    })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.status, "completed"), gte(attempts.completedAt, since)))
    .groupBy(sql`1`);
  const map = new Map(rows.map((r) => [r.day, r.n]));
  const today = dayKey();
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(today, i - days + 1);
    return { day: d, count: map.get(d) ?? 0 };
  });
}

export async function getTotals(userId: string, trackKey: string) {
  const [row] = await db
    .select({
      tests: sql<number>`count(*)::int`,
      avgScore: sql<number>`coalesce(round(avg(${attempts.score})), 0)::int`,
      timeSec: sql<number>`coalesce(sum(${attempts.timeTakenSec}), 0)::int`,
      best: sql<number>`coalesce(max(${attempts.score}), 0)::int`,
    })
    .from(attempts)
    .innerJoin(tests, eq(tests.id, attempts.testId))
    .where(and(eq(attempts.userId, userId), eq(attempts.status, "completed"), eq(tests.trackKey, trackKey)));
  return row ?? { tests: 0, avgScore: 0, timeSec: 0, best: 0 };
}

export async function getWeeklyXp(userId: string) {
  const [row] = await db
    .select({ xp: sql<number>`coalesce(sum(${attempts.xpEarned}), 0)::int` })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.status, "completed"), gte(attempts.completedAt, startOfWeekIST())));
  return row?.xp ?? 0;
}

export async function getLatestReport<K extends "insights" | "study_plan">(userId: string, kind: K) {
  const row = await db.query.aiReports.findFirst({
    where: and(eq(aiReports.userId, userId), eq(aiReports.kind, kind)),
    orderBy: desc(aiReports.createdAt),
  });
  if (!row) return null;
  return {
    createdAt: row.createdAt,
    data: row.data as K extends "insights" ? InsightsReport : StudyPlanReport,
  };
}

export async function getPerformanceSnapshot(userId: string, config: CourseConfig) {
  const nameOf = (slug: string) => subjectName(cat, slug);
  const [cat, u, stats, subjects, topics, trend] = await Promise.all([
    getCatalog(),
    db.query.user.findFirst({ where: eq(user.id, userId), columns: { name: true } }),
    getStats(userId),
    getSubjectPerformance(userId, config),
    getTopics(userId, config.key),
    getScoreTrend(userId, config.key, 10),
  ]);
  return {
    name: u?.name.split(" ")[0] ?? "Student",
    course: config.label,
    audience: config.audience,
    subjectNames: config.subjects.map((s) => nameOf(s.slug)),
    testsCompleted: stats.testsCompleted,
    streak: stats.currentStreak,
    subjects: subjects.filter((s) => s.tests > 0).map((s) => ({ subject: s.name, tests: s.tests, avgScore: s.avgScore, accuracy: s.accuracy })),
    weakTopics: topics.weak.map((t) => ({ subject: nameOf(t.subject), chapter: t.chapter, accuracy: t.accuracy, attempts: t.total })),
    strongTopics: topics.strong.map((t) => ({ subject: nameOf(t.subject), chapter: t.chapter, accuracy: t.accuracy, attempts: t.total })),
    recentScores: trend.map((t) => ({ subject: t.subjectName, score: t.score, date: t.date.slice(0, 10) })),
  };
}
