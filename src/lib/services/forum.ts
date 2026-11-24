import "server-only";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { forumPosts, forumReplies, forumVotes, user } from "@/lib/db/schema";

export type ForumSort = "new" | "top" | "unanswered";

export async function listPosts(opts: { cohort: string; subject?: string; q?: string; sort?: ForumSort; limit?: number; userId: string }) {
  const where = [eq(forumPosts.cohort, opts.cohort)];
  if (opts.subject) where.push(eq(forumPosts.subject, opts.subject));
  if (opts.q) {
    const term = `%${opts.q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(forumPosts.title, term), ilike(forumPosts.body, term))!);
  }
  if (opts.sort === "unanswered") where.push(eq(forumPosts.replyCount, 0));

  const rows = await db
    .select({
      id: forumPosts.id,
      subject: forumPosts.subject,
      title: forumPosts.title,
      // The list shows a two-line preview; don't ship up to 5,000 characters per doubt.
      body: sql<string>`left(${forumPosts.body}, 240)`,
      replyCount: forumPosts.replyCount,
      voteCount: forumPosts.voteCount,
      solved: sql<boolean>`${forumPosts.acceptedReplyId} is not null`,
      createdAt: forumPosts.createdAt,
      authorName: user.name,
      authorImage: user.image,
      authorSchool: user.school,
      voted: sql<boolean>`exists(select 1 from ${forumVotes} v where v.user_id = ${opts.userId} and v.target_type = 'post' and v.target_id = ${forumPosts.id})`,
    })
    .from(forumPosts)
    .innerJoin(user, eq(user.id, forumPosts.userId))
    .where(and(...where))
    .orderBy(...(opts.sort === "top" ? [desc(forumPosts.voteCount), desc(forumPosts.createdAt)] : [desc(forumPosts.createdAt)]))
    .limit(opts.limit ?? 30);
  return rows;
}

/** The doubt, its answers and the viewer's votes — three independent queries in one parallel round trip. */
export async function getPost(postId: string, userId: string) {
  const [[post], replies, votes] = await Promise.all([
    db
      .select({
        id: forumPosts.id,
        userId: forumPosts.userId,
        cohort: forumPosts.cohort,
        subject: forumPosts.subject,
        title: forumPosts.title,
        body: forumPosts.body,
        acceptedReplyId: forumPosts.acceptedReplyId,
        replyCount: forumPosts.replyCount,
        voteCount: forumPosts.voteCount,
        createdAt: forumPosts.createdAt,
        authorName: user.name,
        authorImage: user.image,
        authorSchool: user.school,
      })
      .from(forumPosts)
      .innerJoin(user, eq(user.id, forumPosts.userId))
      .where(eq(forumPosts.id, postId)),
    db
      .select({
        id: forumReplies.id,
        userId: forumReplies.userId,
        body: forumReplies.body,
        isAi: forumReplies.isAi,
        voteCount: forumReplies.voteCount,
        createdAt: forumReplies.createdAt,
        authorName: user.name,
        authorImage: user.image,
        authorSchool: user.school,
      })
      .from(forumReplies)
      .innerJoin(user, eq(user.id, forumReplies.userId))
      .where(eq(forumReplies.postId, postId))
      .orderBy(asc(forumReplies.createdAt)),
    db
      .select({ targetId: forumVotes.targetId })
      .from(forumVotes)
      .where(
        and(
          eq(forumVotes.userId, userId),
          or(
            and(eq(forumVotes.targetType, "post"), eq(forumVotes.targetId, postId)),
            and(eq(forumVotes.targetType, "reply"), sql`${forumVotes.targetId} in (select id from ${forumReplies} where post_id = ${postId})`),
          ),
        ),
      ),
  ]);
  if (!post) return null;
  const voted = new Set(votes.map((v) => v.targetId));

  // Accepted answer first, then by votes, then oldest.
  replies.sort(
    (a, b) =>
      Number(b.id === post.acceptedReplyId) - Number(a.id === post.acceptedReplyId) ||
      b.voteCount - a.voteCount ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );

  return {
    post: { ...post, voted: voted.has(post.id) },
    replies: replies.map((r) => ({ ...r, voted: voted.has(r.id) })),
  };
}

/** Other doubts from the same cohort and subject, looked up from the post id so it can run alongside `getPost`. */
export async function listRelatedPosts(postId: string, limit = 5) {
  const of = (col: "cohort" | "subject") => sql`(select ${sql.identifier(col)} from ${forumPosts} where id = ${postId})`;
  return db
    .select({
      id: forumPosts.id,
      title: forumPosts.title,
      replyCount: forumPosts.replyCount,
      solved: sql<boolean>`${forumPosts.acceptedReplyId} is not null`,
      createdAt: forumPosts.createdAt,
    })
    .from(forumPosts)
    .where(and(sql`${forumPosts.cohort} = ${of("cohort")}`, sql`${forumPosts.subject} = ${of("subject")}`, sql`${forumPosts.id} <> ${postId}`))
    .orderBy(desc(forumPosts.createdAt))
    .limit(limit);
}

/** Header counts for a cohort's forum; shared by everyone in it and expired by the forum actions. */
export async function getCommunityStats(cohort: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("forum-stats");
  const [row] = await db
    .select({
      posts: sql<number>`count(*)::int`,
      solved: sql<number>`sum(case when ${forumPosts.acceptedReplyId} is not null then 1 else 0 end)::int`,
      unanswered: sql<number>`sum(case when ${forumPosts.replyCount} = 0 then 1 else 0 end)::int`,
    })
    .from(forumPosts)
    .where(eq(forumPosts.cohort, cohort));
  return { posts: row?.posts ?? 0, solved: row?.solved ?? 0, unanswered: row?.unanswered ?? 0 };
}
