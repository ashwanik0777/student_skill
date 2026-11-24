import { MessageSquare, MessagesSquare, ThumbsUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilterBar } from "@/components/admin/filters";
import { NoAccess, Pagination, param } from "@/components/admin/misc";
import { DeletePostButton } from "@/components/admin/moderation-actions";
import { TableSkeleton } from "@/components/admin/skeletons";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/admin/permissions";
import { listPostsForModeration } from "@/lib/admin/queries";
import { getCatalogLite } from "@/lib/catalog/server";
import { cohortLabelFromKey, listCohorts, subjectName } from "@/lib/catalog/shared";
import { requireStaff } from "@/lib/session";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Doubt forum" };

export default function CommunityModerationPage({ searchParams }: PageProps<"/admin/community">) {
  return (
    <>
      <PageHeader title="Doubt forum" />
      <Suspense fallback={<TableSkeleton />}>
        <PostList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function PostList({ searchParams }: { searchParams: PageProps<"/admin/community">["searchParams"] }) {
  const staff = await requireStaff();
  if (!can(staff, "community.moderate")) return <NoAccess permission="community.moderate" />;
  const [sp, cat] = await Promise.all([searchParams, getCatalogLite()]);
  const cohorts = listCohorts(cat);
  const q = param(sp, "q");
  const cohort = cohorts.some((c) => c.key === param(sp, "course")) ? param(sp, "course") : undefined;
  const data = await listPostsForModeration({ q, cohort, page: Number(param(sp, "page") ?? 1) });

  return (
    <>
      <FilterBar
        action="/admin/community"
        search={{ name: "q", placeholder: "Search doubts", value: q }}
        selects={[
          {
            name: "course",
            label: "Course",
            value: cohort,
            options: [{ value: "", label: "All courses" }, ...cohorts.map((c) => ({ value: c.key, label: c.label }))],
          },
        ]}
      />
      {data.rows.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="No doubts found" description={q || cohort ? "Try a different search or course." : "Doubts students ask will show up here."} />
      ) : (
        <ul className="space-y-3">
          {data.rows.map((p) => (
            <li key={p.id} className="rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone="neutral">{cohortLabelFromKey(cat, p.cohort)}</Badge>
                    <Badge tone="outline">{subjectName(cat, p.subject)}</Badge>
                  </div>
                  <Link href={`/admin/community/${p.id}`} className="font-semibold hover:underline">
                    {p.title}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.body}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {p.authorName} · {timeAgo(p.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="size-3.5" /> {p.replyCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="size-3.5" /> {p.voteCount}
                    </span>
                  </p>
                </div>
                <DeletePostButton id={p.id} title={p.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={data.page} pages={data.pages} total={data.total} basePath="/admin/community" params={{ q, course: cohort }} noun={["doubt", "doubts"]} />
    </>
  );
}
