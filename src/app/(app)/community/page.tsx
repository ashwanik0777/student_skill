import { BadgeCheck, MessageSquare, MessagesSquare, PenLine, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { VoteButton } from "@/components/community/vote-button";
import { SubjectChip } from "@/components/subject-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { FilterChips, LinkTabs } from "@/components/ui/link-tabs";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { getCommunityStats, listPosts, type ForumSort } from "@/lib/services/forum";
import { getCatalogLite } from "@/lib/catalog/server";
import { subjectName } from "@/lib/catalog/shared";
import { requireLearner } from "@/lib/session";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Doubt Forum" };

export default function CommunityPage(props: PageProps<"/community">) {
  return (
    <>
      <PageHeader
        title="Doubt forum"
        actions={
          <Button asChild>
            <Link href="/community/ask">
              <PenLine /> Ask a doubt
            </Link>
          </Button>
        }
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-10 w-full max-w-md" />
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} lines={2} />
            ))}
          </div>
        }
      >
        <Feed searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Feed({ searchParams }: { searchParams: PageProps<"/community">["searchParams"] }) {
  const [{ user, config }, cat] = await Promise.all([requireLearner(), getCatalogLite()]);
  const sp = await searchParams;
  const subject = typeof sp.subject === "string" && config.subjects.some((s) => s.slug === sp.subject) ? sp.subject : undefined;
  const sort: ForumSort = sp.sort === "top" || sp.sort === "unanswered" ? sp.sort : "new";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";

  const [posts, stats] = await Promise.all([listPosts({ cohort: config.cohort.key, subject, sort, q: q || undefined, userId: user.id }), getCommunityStats(config.cohort.key)]);

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { subject, sort: sort === "new" ? undefined : sort, q: q || undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/community${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Doubts asked", stats.posts],
          ["Solved", stats.solved],
          ["Need an answer", stats.unanswered],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-border bg-surface px-4 py-3">
            <p className="font-display text-2xl font-bold tabular">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <LinkTabs
          active={sort}
          tabs={[
            { value: "new", label: "Latest", href: href({ sort: undefined }) },
            { value: "top", label: "Top", href: href({ sort: "top" }) },
            { value: "unanswered", label: "Unanswered", href: href({ sort: "unanswered" }) },
          ]}
        />
        <form action="/community" className="relative w-full lg:max-w-xs">
          {subject && <input type="hidden" name="subject" value={subject} />}
          {sort !== "new" && <input type="hidden" name="sort" value={sort} />}
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search doubts…" className="h-10 pl-10" aria-label="Search doubts" />
        </form>
      </div>

      <FilterChips
        active={subject ?? "all"}
        items={[
          { value: "all", label: "All subjects", href: href({ subject: undefined }) },
          ...config.subjects.map((s) => ({ value: s.slug, label: subjectName(cat, s.slug), href: href({ subject: s.slug }) })),
        ]}
      />

      {posts.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title={q ? "No doubts match your search" : "No doubts here yet"}
          description={q ? "Try different words, or ask it yourself — someone will help." : "Be the first to ask. Classmates and the AI can answer."}
          action={
            <Button asChild>
              <Link href="/community/ask">
                <PenLine /> Ask a doubt
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="flex gap-4 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong sm:p-5">
              <VoteButton targetType="post" targetId={p.id} count={p.voteCount} voted={p.voted} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SubjectChip subject={p.subject} />
                  {p.solved && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                      <BadgeCheck className="size-3.5" /> Solved
                    </span>
                  )}
                </div>
                <Link href={`/community/${p.id}`} className="mt-2 block">
                  <h2 className="font-sans text-base font-semibold leading-snug tracking-normal hover:text-brand-ink">{p.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.body}</p>
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={p.authorName} src={p.authorImage} size="xs" />
                    <span className="font-medium text-foreground">{p.authorName}</span>
                    {p.authorSchool && <span className="hidden max-w-48 truncate sm:inline">· {p.authorSchool}</span>}
                  </span>
                  <span>{timeAgo(p.createdAt)}</span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="size-3.5" /> {p.replyCount} {p.replyCount === 1 ? "answer" : "answers"}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
