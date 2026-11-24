import "server-only";
import { eq, sql } from "drizzle-orm";
import { getCourseConfig } from "@/lib/catalog/server";
import { trackFromUser, type CourseConfig } from "@/lib/catalog/shared";
import { db } from "@/lib/db";
import { attempts, forumPosts, forumReplies, tests, trackEvents, user, userBadges, userStats } from "@/lib/db/schema";
import { type BadgeContext, newlyEarnedBadges } from "@/lib/gamification";

type Executor = Pick<typeof db, "select" | "insert" | "execute">;

/** What the "ace every subject" badge needs to know about the student's current course. */
export type BadgeTrack = { key: string; subjectCount: number };

export function badgeTrackOf(config: CourseConfig | null | undefined): BadgeTrack | null {
  return config ? { key: config.key, subjectCount: config.subjects.length } : null;
}

/** Only needed when the caller doesn't already know the student's course (e.g. accepting someone else's answer). */
async function resolveTrack(exec: Executor, userId: string): Promise<BadgeTrack | null> {
  const [row] = await exec
    .select({ trackKind: user.trackKind, board: user.board, grade: user.grade, stream: user.stream, exam: user.exam })
    .from(user)
    .where(eq(user.id, userId));
  return badgeTrackOf(row ? await getCourseConfig(trackFromUser(row)) : null);
}

/**
 * Everything the badge rules look at, in ONE query (scalar subqueries), instead of eight round trips.
 * Community counts only include answers to *other* students' doubts.
 */
async function buildContext(exec: Executor, userId: string, track?: BadgeTrack | null) {
  const t = track === undefined ? await resolveTrack(exec, userId) : track;
  const aceSql = t
    ? sql`(select count(distinct t.subject) from ${attempts} a join ${tests} t on t.id = a.test_id
          where a.user_id = ${userId} and a.status = 'completed' and t.track_key = ${t.key} and t.kind = 'daily'
            and a.score >= 80 and coalesce(a.end_reason, 'submitted') <> 'tab_switch')::int`
    : sql`0`;
  const result = await exec.execute<{
    tests_completed: number;
    current_streak: number;
    xp: number;
    practice_generated: number;
    forum_posts: number;
    forum_replies: number;
    accepted_answers: number;
    ace_subjects: number;
    promotions: number;
    owned: { id: string; at: string }[];
  }>(sql`
    select
      coalesce(s.tests_completed, 0)::int as tests_completed,
      coalesce(s.current_streak, 0)::int as current_streak,
      coalesce(s.xp, 0)::int as xp,
      coalesce(s.practice_generated, 0)::int as practice_generated,
      (select count(*) from ${forumPosts} where user_id = ${userId})::int as forum_posts,
      (select count(distinct r.post_id) from ${forumReplies} r join ${forumPosts} p on p.id = r.post_id
        where r.user_id = ${userId} and not r.is_ai and p.user_id <> ${userId})::int as forum_replies,
      (select count(*) from ${forumPosts} p join ${forumReplies} r on r.id = p.accepted_reply_id
        where r.user_id = ${userId} and not r.is_ai and p.user_id <> ${userId})::int as accepted_answers,
      ${aceSql} as ace_subjects,
      (select count(*) from ${trackEvents} where user_id = ${userId} and type = 'promoted')::int as promotions,
      coalesce((select json_agg(json_build_object('id', ${userBadges.badgeId}, 'at', ${userBadges.earnedAt})) from ${userBadges} where ${userBadges.userId} = ${userId}), '[]'::json) as owned
    from (select 1) as one
    left join ${userStats} s on s.user_id = ${userId}
  `);
  const r = result.rows[0];
  const ctx: BadgeContext = {
    testsCompleted: r.tests_completed,
    currentStreak: r.current_streak,
    xp: r.xp,
    practiceGenerated: r.practice_generated,
    forumPosts: r.forum_posts,
    forumReplies: r.forum_replies,
    acceptedAnswers: r.accepted_answers,
    aceSubjects: r.ace_subjects,
    trackSubjectCount: t?.subjectCount ?? 0,
    promotions: r.promotions,
  };
  return { ctx, owned: r.owned.map((o) => ({ id: o.id, at: new Date(o.at) })) };
}

/**
 * Re-evaluates every badge and stores the newly earned ones. Returns the new badge ids.
 * With `attemptId`, the new badges are also written onto that attempt — in the same statement as the insert.
 */
export async function awardBadges(
  exec: Executor,
  userId: string,
  opts: { attempt?: BadgeContext["attempt"]; track?: BadgeTrack | null; attemptId?: string } = {},
) {
  const { ctx, owned } = await buildContext(exec, userId, opts.track);
  const fresh = newlyEarnedBadges({ ...ctx, attempt: opts.attempt }, new Set(owned.map((o) => o.id)));
  if (fresh.length === 0) return fresh;
  const values = sql.join(
    fresh.map((badgeId) => sql`(${userId}, ${badgeId})`),
    sql`, `,
  );
  if (opts.attemptId) {
    await exec.execute(sql`
      with earned as (
        insert into ${userBadges} (user_id, badge_id) values ${values} on conflict do nothing
      )
      update ${attempts} set new_badges = ${JSON.stringify(fresh)}::jsonb where id = ${opts.attemptId}`);
  } else {
    await exec.execute(sql`insert into ${userBadges} (user_id, badge_id) values ${values} on conflict do nothing`);
  }
  return fresh;
}

export async function getBadgeContext(userId: string, track?: BadgeTrack | null): Promise<{ ctx: BadgeContext; owned: Map<string, Date> }> {
  const { ctx, owned } = await buildContext(db, userId, track);
  return { ctx, owned: new Map(owned.map((o) => [o.id, o.at])) };
}
