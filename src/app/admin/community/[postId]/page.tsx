import { ArrowLeft, BadgeCheck, Bot, ThumbsUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/misc";
import { DeletePostButton, DeleteReplyButton } from "@/components/admin/moderation-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { can } from "@/lib/admin/permissions";
import { getPostForModeration } from "@/lib/admin/queries";
import { getCatalogLite } from "@/lib/catalog/server";
import { cohortLabelFromKey, subjectName } from "@/lib/catalog/shared";
import { requireStaff } from "@/lib/session";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Doubt" };

export default function ModeratePostPage({ params }: PageProps<"/admin/community/[postId]">) {
  return (
    <>
      <Link href="/admin/community" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All doubts
      </Link>
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <ModeratePost params={params} />
      </Suspense>
    </>
  );
}

async function ModeratePost({ params }: { params: PageProps<"/admin/community/[postId]">["params"] }) {
  const staff = await requireStaff();
  if (!can(staff, "community.moderate")) return <NoAccess permission="community.moderate" />;
  const { postId } = await params;
  const [data, cat] = await Promise.all([getPostForModeration(postId), getCatalogLite()]);
  if (!data) notFound();
  const { post, replies } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <article className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{cohortLabelFromKey(cat, post.cohort)}</Badge>
            <Badge tone="outline">{subjectName(cat, post.subject)}</Badge>
          </div>
          <DeletePostButton id={post.id} title={post.title} afterDelete="/admin/community" />
        </div>
        <h1 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">{post.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {post.authorName} ({post.authorEmail}) · {timeAgo(post.createdAt)} · <ThumbsUp className="inline size-3.5" /> {post.voteCount}
        </p>
        <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{post.body}</p>
      </article>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          {replies.length} {replies.length === 1 ? "answer" : "answers"}
        </h2>
        {replies.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-muted-foreground">No answers yet.</p>
        ) : (
          <ul className="space-y-3">
            {replies.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {r.isAi ? (
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink">
                        <Bot className="size-4" />
                      </span>
                    ) : (
                      <Avatar name={r.authorName} size="sm" />
                    )}
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                        {r.authorName}
                        {r.isAi && <Badge tone="brand">AI</Badge>}
                        {post.acceptedReplyId === r.id && (
                          <Badge tone="success">
                            <BadgeCheck /> Accepted
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {timeAgo(r.createdAt)} · {r.voteCount} {r.voteCount === 1 ? "vote" : "votes"}
                      </p>
                    </div>
                  </div>
                  <DeleteReplyButton id={r.id} isAi={r.isAi} />
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
