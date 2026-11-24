import "server-only";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { attempts, user, userStats } from "@/lib/db/schema";
import { startOfWeekIST } from "@/lib/utils";

export type LeaderboardPeriod = "week" | "all";
export type LeaderboardScope = "india" | "school";

export type LeaderRow = {
  userId: string;
  name: string;
  image: string | null;
  school: string | null;
  city: string | null;
  xp: number;
  tests: number;
  avgScore: number;
  rank: number;
};

function schoolFilter(school: string | null | undefined) {
  if (!school) return sql`false`;
  return sql`lower(trim(${user.school})) = lower(trim(${school}))`;
}

export function leaderboardTag(cohort: string) {
  return `leaderboard:${cohort}`;
}

export async function getLeaderboard(opts: {
  period: LeaderboardPeriod;
  scope: LeaderboardScope;
  cohort: string;
  school?: string | null;
  limit?: number;
}): Promise<LeaderRow[]> {
  // The same board is shown to everyone in a cohort, so it is cached and shared. Test submissions mark it stale
  // (`leaderboardTag`) and it refreshes in the background; each student's own rank is always computed live.
  "use cache";
  cacheLife("minutes");
  cacheTag(leaderboardTag(opts.cohort));
  const limit = opts.limit ?? 50;
  // Suspended accounts never appear on (or count towards) a leaderboard.
  const scopeWhere = and(eq(user.cohort, opts.cohort), isNull(user.suspendedAt), opts.scope === "school" ? schoolFilter(opts.school) : sql`true`)!;

  if (opts.period === "all") {
    const rows = await db
      .select({
        userId: user.id,
        name: user.name,
        image: user.image,
        school: user.school,
        city: user.city,
        xp: userStats.xp,
        tests: userStats.testsCompleted,
        avgScore: sql<number>`coalesce((select round(avg(a.score)) from ${attempts} a where a.user_id = ${user.id} and a.status = 'completed'), 0)::int`,
      })
      .from(userStats)
      .innerJoin(user, eq(user.id, userStats.userId))
      .where(and(sql`${userStats.xp} > 0`, scopeWhere))
      .orderBy(desc(userStats.xp), desc(userStats.testsCompleted))
      .limit(limit);
    return rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }

  const since = startOfWeekIST();
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      image: user.image,
      school: user.school,
      city: user.city,
      xp: sql<number>`sum(${attempts.xpEarned})::int`,
      tests: sql<number>`count(*)::int`,
      avgScore: sql<number>`coalesce(round(avg(${attempts.score})), 0)::int`,
    })
    .from(attempts)
    .innerJoin(user, eq(user.id, attempts.userId))
    .where(and(eq(attempts.status, "completed"), gte(attempts.completedAt, since), scopeWhere))
    .groupBy(user.id)
    .having(sql`sum(${attempts.xpEarned}) > 0`)
    .orderBy(desc(sql`sum(${attempts.xpEarned})`), desc(sql`count(*)`))
    .limit(limit);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** The current user's own position, even when they're outside the top list. */
export async function getMyRank(
  userId: string,
  opts: { period: LeaderboardPeriod; scope: LeaderboardScope; cohort: string; school?: string | null },
) {
  // Suspended accounts never appear on (or count towards) a leaderboard.
  const scopeWhere = and(eq(user.cohort, opts.cohort), isNull(user.suspendedAt), opts.scope === "school" ? schoolFilter(opts.school) : sql`true`)!;
  // One round trip per period: the student's XP and how many in scope are ahead of them.
  if (opts.period === "all") {
    const [row] = await db
      .select({
        xp: userStats.xp,
        ahead: sql<number>`(select count(*) from ${userStats} s2 inner join ${user} on ${user.id} = s2.user_id where s2.xp > ${userStats.xp} and ${scopeWhere})::int`,
      })
      .from(userStats)
      .where(eq(userStats.userId, userId));
    if (!row || row.xp <= 0) return null;
    return { rank: row.ahead + 1, xp: row.xp };
  }
  const since = startOfWeekIST();
  const result = await db.execute<{ xp: number; ahead: number }>(sql`
    with totals as (
      select a.user_id, sum(a.xp_earned) as xp
      from ${attempts} a inner join ${user} on ${user.id} = a.user_id
      where a.status = 'completed' and a.completed_at >= ${since} and ${scopeWhere}
      group by a.user_id
    ), mine as (
      select coalesce(sum(xp_earned), 0)::int as xp from ${attempts}
      where user_id = ${userId} and status = 'completed' and completed_at >= ${since}
    )
    select mine.xp, (select count(*) from totals where totals.xp > mine.xp)::int as ahead from mine`);
  const row = result.rows[0];
  if (!row || row.xp <= 0) return null;
  return { rank: row.ahead + 1, xp: row.xp };
}
