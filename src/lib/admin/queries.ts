import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import {
  adminAudit,
  announcements,
  attempts,
  forumPosts,
  forumReplies,
  session,
  tests,
  trackEvents,
  user,
  userBadges,
  userStats,
} from "@/lib/db/schema";
import { AI_USER_ID } from "@/lib/system-users";

export const ADMIN_PAGE_SIZE = 25;

/** Students only: excludes staff accounts and the built-in AI account. */
const isStudent = and(eq(user.role, "student"), ne(user.id, AI_USER_ID))!;

/** Escapes LIKE wildcards so a search for "50%" matches literally. */
function likeTerm(q: string) {
  return `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
}

function pageOf(page: number | undefined) {
  return Math.max(1, Math.floor(page ?? 1) || 1);
}

/* ───────────────────────────── Overview ───────────────────────────── */

export type DailyPoint = { day: string; signups: number; tests: number; active: number };

export type AdminOverview = {
  generatedAt: string;
  students: { total: number; onboarded: number; newWeek: number; newToday: number; suspended: number };
  activity: { activeToday: number; activeWeek: number; testsToday: number; testsWeek: number; avgScore: number | null };
  community: { postsWeek: number; repliesWeek: number };
  daily: DailyPoint[];
  cohorts: { cohort: string; students: number }[];
  recent: { id: string; name: string; email: string; cohort: string | null; onboarded: boolean; createdAt: Date }[];
};

/**
 * Platform numbers for the admin overview. Shared by every staff member and refreshed every minute or so,
 * so opening the dashboard never runs these aggregates more than once per cache window.
 * All four queries run in parallel — one network round trip to the database.
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  "use cache";
  cacheLife("minutes");
  cacheTag("admin-overview");

  const istToday = sql`date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'`;

  const [kpiRows, dailyRows, cohorts, recent] = await Promise.all([
    db.execute<{
      total: number;
      onboarded: number;
      new_week: number;
      new_today: number;
      suspended: number;
      active_today: number;
      active_week: number;
      tests_today: number;
      tests_week: number;
      avg_score: number | null;
      posts_week: number;
      replies_week: number;
    }>(sql`
      with s as (
        select * from ${user} where ${isStudent}
      ), a as (
        select user_id, score, completed_at from ${attempts}
        where status = 'completed' and completed_at >= now() - interval '30 days'
      )
      select
        (select count(*) from s)::int as total,
        (select count(*) from s where onboarded)::int as onboarded,
        (select count(*) from s where created_at >= now() - interval '7 days')::int as new_week,
        (select count(*) from s where created_at >= ${istToday})::int as new_today,
        (select count(*) from s where suspended_at is not null)::int as suspended,
        (select count(distinct user_id) from a where completed_at >= ${istToday})::int as active_today,
        (select count(distinct user_id) from a where completed_at >= now() - interval '7 days')::int as active_week,
        (select count(*) from a where completed_at >= ${istToday})::int as tests_today,
        (select count(*) from a where completed_at >= now() - interval '7 days')::int as tests_week,
        (select round(avg(score))::int from a) as avg_score,
        (select count(*) from ${forumPosts} where created_at >= now() - interval '7 days')::int as posts_week,
        (select count(*) from ${forumReplies} where created_at >= now() - interval '7 days')::int as replies_week
    `),
    db.execute<{ day: string; signups: number; tests: number; active: number }>(sql`
      with days as (
        select generate_series(
          (now() at time zone 'Asia/Kolkata')::date - 29,
          (now() at time zone 'Asia/Kolkata')::date,
          interval '1 day'
        )::date as d
      ), su as (
        select (created_at at time zone 'Asia/Kolkata')::date as d, count(*) as c
        from ${user} where ${isStudent} and created_at >= now() - interval '31 days'
        group by 1
      ), te as (
        select (completed_at at time zone 'Asia/Kolkata')::date as d, count(*) as c, count(distinct user_id) as u
        from ${attempts} where status = 'completed' and completed_at >= now() - interval '31 days'
        group by 1
      )
      select to_char(days.d, 'YYYY-MM-DD') as day,
        coalesce(su.c, 0)::int as signups,
        coalesce(te.c, 0)::int as tests,
        coalesce(te.u, 0)::int as active
      from days left join su on su.d = days.d left join te on te.d = days.d
      order by days.d
    `),
    db
      .select({ cohort: user.cohort, students: sql<number>`count(*)::int` })
      .from(user)
      .where(and(isStudent, isNotNull(user.cohort)))
      .groupBy(user.cohort)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({ id: user.id, name: user.name, email: user.email, cohort: user.cohort, onboarded: user.onboarded, createdAt: user.createdAt })
      .from(user)
      .where(isStudent)
      .orderBy(desc(user.createdAt))
      .limit(6),
  ]);

  const k = kpiRows.rows[0];
  return {
    generatedAt: new Date().toISOString(),
    students: { total: k.total, onboarded: k.onboarded, newWeek: k.new_week, newToday: k.new_today, suspended: k.suspended },
    activity: {
      activeToday: k.active_today,
      activeWeek: k.active_week,
      testsToday: k.tests_today,
      testsWeek: k.tests_week,
      avgScore: k.avg_score,
    },
    community: { postsWeek: k.posts_week, repliesWeek: k.replies_week },
    daily: dailyRows.rows,
    cohorts: cohorts.map((c) => ({ cohort: c.cohort!, students: c.students })),
    recent,
  };
}

/* ───────────────────────────── Students ───────────────────────────── */

export type StudentStatus = "all" | "active" | "suspended" | "pending";
export type StudentSort = "newest" | "xp" | "active";

export type StudentFilters = { q?: string; status?: StudentStatus; cohort?: string; sort?: StudentSort; page?: number };

export async function listStudents(filters: StudentFilters) {
  const page = pageOf(filters.page);
  const q = filters.q?.trim();
  const conditions: (SQL | undefined)[] = [
    isStudent,
    q ? or(ilike(user.name, likeTerm(q)), ilike(user.email, likeTerm(q))) : undefined,
    filters.cohort ? eq(user.cohort, filters.cohort) : undefined,
    filters.status === "suspended" ? isNotNull(user.suspendedAt) : undefined,
    filters.status === "active" ? and(isNull(user.suspendedAt), eq(user.onboarded, true)) : undefined,
    filters.status === "pending" ? and(isNull(user.suspendedAt), eq(user.onboarded, false)) : undefined,
  ];
  const where = and(...conditions);
  const order =
    filters.sort === "xp"
      ? [desc(sql`coalesce(${userStats.xp}, 0)`), desc(user.createdAt)]
      : filters.sort === "active"
        ? [sql`${userStats.lastActiveDay} desc nulls last`, desc(user.createdAt)]
        : [desc(user.createdAt)];

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        school: user.school,
        trackKind: user.trackKind,
        board: user.board,
        grade: user.grade,
        stream: user.stream,
        exam: user.exam,
        onboarded: user.onboarded,
        suspendedAt: user.suspendedAt,
        createdAt: user.createdAt,
        xp: sql<number>`coalesce(${userStats.xp}, 0)::int`,
        tests: sql<number>`coalesce(${userStats.testsCompleted}, 0)::int`,
        streak: sql<number>`coalesce(${userStats.currentStreak}, 0)::int`,
        lastActiveDay: userStats.lastActiveDay,
      })
      .from(user)
      .leftJoin(userStats, eq(userStats.userId, user.id))
      .where(where)
      .orderBy(...order)
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ total: count() }).from(user).where(where),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

export type StudentRow = Awaited<ReturnType<typeof listStudents>>["rows"][number];

export async function getStudentDetail(id: string) {
  const [profile, stats, recentAttempts, events, [{ badges }], [{ sessions }]] = await Promise.all([
    db.query.user.findFirst({ where: eq(user.id, id) }),
    db.query.userStats.findFirst({ where: eq(userStats.userId, id) }),
    db
      .select({
        id: attempts.id,
        title: tests.title,
        subject: tests.subject,
        kind: tests.kind,
        score: attempts.score,
        correct: attempts.correct,
        total: attempts.total,
        endReason: attempts.endReason,
        completedAt: attempts.completedAt,
      })
      .from(attempts)
      .innerJoin(tests, eq(tests.id, attempts.testId))
      .where(and(eq(attempts.userId, id), eq(attempts.status, "completed")))
      .orderBy(desc(attempts.completedAt))
      .limit(10),
    db.select().from(trackEvents).where(eq(trackEvents.userId, id)).orderBy(desc(trackEvents.createdAt)).limit(10),
    db.select({ badges: count() }).from(userBadges).where(eq(userBadges.userId, id)),
    db.select({ sessions: count() }).from(session).where(and(eq(session.userId, id), sql`${session.expiresAt} > now()`)),
  ]);
  if (!profile || profile.id === AI_USER_ID) return null;
  return { profile, stats: stats ?? null, recentAttempts, events, badges, sessions };
}

/* ───────────────────────────── Staff ───────────────────────────── */

export async function listStaff() {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      permissions: user.permissions,
      suspendedAt: user.suspendedAt,
      createdAt: user.createdAt,
      lastSeen: sql<Date | null>`(select max(${session.updatedAt}) from ${session} where ${session.userId} = ${user.id})`.mapWith(session.updatedAt),
    })
    .from(user)
    .where(inArray(user.role, ["admin", "sub_admin"]))
    .orderBy(asc(user.role), asc(user.createdAt));
}

export type StaffRow = Awaited<ReturnType<typeof listStaff>>[number];

/* ───────────────────────────── Community ───────────────────────────── */

export async function listPostsForModeration(filters: { q?: string; cohort?: string; page?: number }) {
  const page = pageOf(filters.page);
  const q = filters.q?.trim();
  const where = and(
    q ? or(ilike(forumPosts.title, likeTerm(q)), ilike(forumPosts.body, likeTerm(q))) : undefined,
    filters.cohort ? eq(forumPosts.cohort, filters.cohort) : undefined,
  );
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        body: sql<string>`left(${forumPosts.body}, 220)`,
        cohort: forumPosts.cohort,
        subject: forumPosts.subject,
        replyCount: forumPosts.replyCount,
        voteCount: forumPosts.voteCount,
        createdAt: forumPosts.createdAt,
        authorId: user.id,
        authorName: user.name,
        authorEmail: user.email,
      })
      .from(forumPosts)
      .innerJoin(user, eq(user.id, forumPosts.userId))
      .where(where)
      .orderBy(desc(forumPosts.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ total: count() }).from(forumPosts).where(where),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

export async function getPostForModeration(id: string) {
  const [post, replies] = await Promise.all([
    db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        body: forumPosts.body,
        cohort: forumPosts.cohort,
        subject: forumPosts.subject,
        acceptedReplyId: forumPosts.acceptedReplyId,
        replyCount: forumPosts.replyCount,
        voteCount: forumPosts.voteCount,
        createdAt: forumPosts.createdAt,
        authorId: user.id,
        authorName: user.name,
        authorEmail: user.email,
      })
      .from(forumPosts)
      .innerJoin(user, eq(user.id, forumPosts.userId))
      .where(eq(forumPosts.id, id))
      .limit(1),
    db
      .select({
        id: forumReplies.id,
        body: forumReplies.body,
        isAi: forumReplies.isAi,
        voteCount: forumReplies.voteCount,
        createdAt: forumReplies.createdAt,
        authorId: user.id,
        authorName: user.name,
      })
      .from(forumReplies)
      .innerJoin(user, eq(user.id, forumReplies.userId))
      .where(eq(forumReplies.postId, id))
      .orderBy(asc(forumReplies.createdAt)),
  ]);
  return post[0] ? { post: post[0], replies } : null;
}

/* ───────────────────────────── Announcements ───────────────────────────── */

export async function listAnnouncements() {
  return db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      audience: announcements.audience,
      tone: announcements.tone,
      active: announcements.active,
      endsAt: announcements.endsAt,
      expired: sql<boolean>`(${announcements.endsAt} is not null and ${announcements.endsAt} <= now())`,
      createdAt: announcements.createdAt,
      createdByName: user.name,
    })
    .from(announcements)
    .leftJoin(user, eq(user.id, announcements.createdBy))
    .orderBy(desc(announcements.createdAt))
    .limit(100);
}

/** What a student sees on their dashboard. Cached per cohort; admin actions expire the "announcements" tag. */
export async function getActiveAnnouncements(cohort: string | null) {
  "use cache";
  cacheLife("minutes");
  cacheTag("announcements");
  return db
    .select({ id: announcements.id, title: announcements.title, body: announcements.body, tone: announcements.tone })
    .from(announcements)
    .where(
      and(
        eq(announcements.active, true),
        cohort ? inArray(announcements.audience, ["all", cohort]) : eq(announcements.audience, "all"),
        sql`(${announcements.endsAt} is null or ${announcements.endsAt} > now())`,
      ),
    )
    .orderBy(desc(announcements.createdAt))
    .limit(3);
}

/* ───────────────────────────── Audit log ───────────────────────────── */

export const AUDIT_PAGE_SIZE = 40;

export async function listAudit(filters: { actor?: string; action?: string; page?: number }) {
  const page = pageOf(filters.page);
  const where = and(
    filters.actor ? eq(adminAudit.actorId, filters.actor) : undefined,
    filters.action ? ilike(adminAudit.action, `${filters.action.replace(/[\\%_]/g, "")}%`) : undefined,
  );
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(adminAudit)
      .where(where)
      .orderBy(desc(adminAudit.createdAt))
      .limit(AUDIT_PAGE_SIZE)
      .offset((page - 1) * AUDIT_PAGE_SIZE),
    db.select({ total: count() }).from(adminAudit).where(where),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)) };
}

export async function listAuditActors() {
  return db
    .selectDistinct({ id: adminAudit.actorId, name: adminAudit.actorName })
    .from(adminAudit)
    .where(isNotNull(adminAudit.actorId))
    .orderBy(asc(adminAudit.actorName));
}
