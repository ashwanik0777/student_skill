import { ArrowLeft, BadgeCheck, MessageSquare, PenLine, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AcceptButton, AiAnswerPoller, AskAiButton, DeleteButton, ReplyForm } from "@/components/community/post-actions";
import { VoteButton } from "@/components/community/vote-button";
import { LogoMark } from "@/components/brand/logo";
import { Markdown } from "@/components/markdown";
import { SubjectChip } from "@/components/subject-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/skeleton";
import { aiStatus } from "@/lib/ai/model";
import { getPost, listRelatedPosts } from "@/lib/services/forum";
import { subjectName as subjectNameOf } from "@/lib/catalog/server";
import { requireUser } from "@/lib/session";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Doubt" };

export default function PostPage(props: PageProps<"/community/[postId]">) {
  return (
    <>
      <Link href="/community" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Doubt forum
      </Link>
      <Suspense
        fallback={
          <div className="space-y-4">
            <CardSkeleton lines={5} />
            <CardSkeleton lines={3} />
          </div>
        }
      >
        <Post params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Post({
  params,
  searchParams,
}: {
  params: PageProps<"/community/[postId]">["params"];
  searchParams: PageProps<"/community/[postId]">["searchParams"];
}) {
  const user = await requireUser();
  const [{ postId }, sp] = await Promise.all([params, searchParams]);
  const [data, related] = await Promise.all([getPost(postId, user.id), listRelatedPosts(postId)]);
  if (!data) notFound();
  const { post, replies } = data;
  const isAuthor = post.userId === user.id;
  const hasAi = replies.some((r) => r.isAi);
  const subjectName = await subjectNameOf(post.subject);

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-8 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">
        <article className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
          <div className="flex gap-4">
            <VoteButton targetType="post" targetId={post.id} count={post.voteCount} voted={post.voted} disabled={isAuthor} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <SubjectChip subject={post.subject} />
                {post.acceptedReplyId && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                    <BadgeCheck className="size-3.5" /> Solved
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight">{post.title}</h1>
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar name={post.authorName} src={post.authorImage} size="xs" />
                <span className="font-medium text-foreground">{post.authorName}</span>
                {post.authorSchool && <span className="hidden truncate sm:inline">· {post.authorSchool}</span>}
                <span>· {timeAgo(post.createdAt)}</span>
              </div>
              <Markdown className="mt-5">{post.body}</Markdown>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {!hasAi && aiStatus().available && <AskAiButton postId={post.id} />}
                {isAuthor && <DeleteButton kind="post" id={post.id} />}
              </div>
            </div>
          </div>
        </article>

        {sp.ai === "1" && <AiAnswerPoller hasAiReply={hasAi} />}

        <section>
          <h2 className="mb-4 text-lg font-semibold">
            {replies.length} {replies.length === 1 ? "Answer" : "Answers"}
          </h2>
          {replies.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border-strong px-4 py-8 text-center text-sm text-muted-foreground">
              No answers yet. Know the answer? Help a classmate out below.
            </p>
          ) : (
            <ul className="space-y-4">
              {replies.map((r) => {
                const accepted = r.id === post.acceptedReplyId;
                return (
                  <li
                    key={r.id}
                    className={cn(
                      "rounded-2xl border bg-surface p-5 sm:p-6",
                      accepted ? "border-success/40 shadow-[0_0_0_3px_var(--success-soft)]" : "border-border",
                    )}
                  >
                    <div className="flex gap-4">
                      <VoteButton targetType="reply" targetId={r.id} count={r.voteCount} voted={r.voted} disabled={r.userId === user.id} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          {r.isAi ? <LogoMark className="size-6" /> : <Avatar name={r.authorName} src={r.authorImage} size="xs" />}
                          <span className="font-medium">{r.authorName}</span>
                          {r.isAi && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-ink">
                              <Sparkles className="size-3" /> AI answer
                            </span>
                          )}
                          {!r.isAi && r.authorSchool && <span className="hidden truncate text-muted-foreground sm:inline">· {r.authorSchool}</span>}
                          <span className="text-muted-foreground">· {timeAgo(r.createdAt)}</span>
                          {accepted && (
                            <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-success">
                              <BadgeCheck className="size-4" /> Accepted answer
                            </span>
                          )}
                        </div>
                        <Markdown className="mt-3">{r.body}</Markdown>
                        {(isAuthor || r.userId === user.id) && (
                          <div className="mt-4 flex flex-wrap gap-1">
                            {isAuthor && <AcceptButton postId={post.id} replyId={r.id} accepted={accepted} />}
                            {r.userId === user.id && <DeleteButton kind="reply" id={r.id} />}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <ReplyForm postId={post.id} />
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="font-semibold">Have a different doubt?</p>
          <p className="mt-1 text-sm text-muted-foreground">Ask it — classmates and the AI can help you out.</p>
          <Button asChild className="mt-4 w-full">
            <Link href="/community/ask">
              <PenLine /> Ask a doubt
            </Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="font-semibold">More in {subjectName}</p>
          {related.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No other doubts in this subject yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {related.map((r) => (
                <li key={r.id}>
                  <Link href={`/community/${r.id}`} className="block py-3 transition-colors hover:text-brand-ink">
                    <p className="line-clamp-2 text-sm font-medium">{r.title}</p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="size-3" /> {r.replyCount}
                      </span>
                      {r.solved && (
                        <span className="inline-flex items-center gap-1 text-success">
                          <BadgeCheck className="size-3" /> Solved
                        </span>
                      )}
                      <span>{timeAgo(r.createdAt)}</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 text-sm">
          <p className="font-semibold">Forum guidelines</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>• Explain the steps, not just the final answer.</li>
            <li>• Be kind — everyone is learning.</li>
            <li>• Accept the answer that helped you most.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
