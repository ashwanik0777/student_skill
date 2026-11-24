import { ArrowRight, ClipboardList, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { SubjectIcon } from "@/components/subject-badge";
import { AttemptList } from "@/components/tests/attempt-list";
import { DownloadToday } from "@/components/tests/download-today";
import { SundayCard, TodayTestList } from "@/components/tests/today-tests";
import { Button } from "@/components/ui/button";
import { Card, CardContent, SectionHeading } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips, LinkTabs } from "@/components/ui/link-tabs";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { getTodayTests, listAttempts, listPendingPractice } from "@/lib/services/tests";
import { getCatalogLite } from "@/lib/catalog/server";
import { subjectName, type CourseConfig } from "@/lib/catalog/shared";
import { requireLearner } from "@/lib/session";
import type { TestKind } from "@/lib/types";
import { formatDuration, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Tests" };

type SP = PageProps<"/tests">["searchParams"];

export default function TestsPage(props: PageProps<"/tests">) {
  return (
    <>
      <PageHeader
        title="Tests"
        actions={
          <Button asChild variant="outline">
            <Link href="/practice">
              <Sparkles /> Create practice test
            </Link>
          </Button>
        }
      />
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-10 w-56" />
            <CardSkeleton lines={6} />
          </div>
        }
      >
        <TestsContent searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

async function TestsContent({ searchParams }: { searchParams: SP }) {
  const { user, config } = await requireLearner();
  const sp = await searchParams;
  const tab = one(sp.tab) === "history" ? "history" : "today";

  return (
    <div className="animate-fade-up">
      <LinkTabs
        className="mb-6"
        active={tab}
        tabs={[
          { value: "today", label: "Today", href: "/tests" },
          { value: "history", label: "History", href: "/tests?tab=history" },
        ]}
      />
      {tab === "today" ? <Today userId={user.id} config={config} /> : <History userId={user.id} config={config} sp={sp} />}
    </div>
  );
}

async function Today({ userId, config }: { userId: string; config: CourseConfig }) {
  const [today, pending] = await Promise.all([getTodayTests(userId, config), listPendingPractice(userId, config.key)]);
  const remaining = today.items.filter((i) => i.status !== "completed").length;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardContent>
            <SectionHeading
              title="Daily tests"
              description={`${config.daily.questions} questions · ${Math.round(config.daily.durationSec / 60)} minutes · exam mode`}
              action={
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold tabular">
                  {today.completed}/{today.items.length} done
                </span>
              }
            />
            <TodayTestList items={today.items} />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <SundayCard item={today.sunday} isSunday={today.isSunday} weekly={today.weekly} />
          <Card>
            <CardContent>
              <h3 className="font-semibold">How daily tests work</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• A new personalised test for each subject unlocks every day at midnight (IST).</li>
                <li>• Chapters you find hard appear more often until you master them.</li>
                <li>• Finish at least one test a day to keep your streak alive.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <DownloadToday pending={remaining} />

      {pending.length > 0 && (
        <section>
          <SectionHeading title="Practice tests waiting for you" />
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pending.map((p) => (
              <li key={p.testId}>
                <Link
                  href={`/test/${p.testId}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong"
                >
                  <SubjectIcon subject={p.subject} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.questionCount} Qs · {p.durationSec ? formatDuration(p.durationSec) : "untimed"} · {timeAgo(p.createdAt)}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const PAGE_SIZE = 15;

async function History({ userId, config, sp }: { userId: string; config: CourseConfig; sp: Awaited<SP> }) {
  const cat = await getCatalogLite();
  const subjectParam = one(sp.subject);
  const kindParam = one(sp.kind);
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const subject = subjectParam && (config.subjects.some((s) => s.slug === subjectParam) || subjectParam === "mixed") ? subjectParam : undefined;
  const kind = (["daily", "sunday", "practice"] as const).includes(kindParam as TestKind) ? (kindParam as TestKind) : undefined;

  const rows = await listAttempts(userId, { subject, kind, limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE });
  const hasMore = rows.length > PAGE_SIZE;

  const href = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams({ tab: "history" });
    const merged = { subject, kind, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    return `/tests?${q.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <FilterChips
          active={subject ?? "all"}
          items={[
            { value: "all", label: "All subjects", href: href({ subject: undefined }) },
            ...config.subjects.map((s) => ({ value: s.slug, label: subjectName(cat, s.slug), href: href({ subject: s.slug }) })),
          ]}
        />
        <FilterChips
          active={kind ?? "all"}
          items={[
            { value: "all", label: "All types", href: href({ kind: undefined }) },
            { value: "daily", label: "Daily", href: href({ kind: "daily" }) },
            { value: "sunday", label: "Sunday", href: href({ kind: "sunday" }) },
            { value: "practice", label: "Practice", href: href({ kind: "practice" }) },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={page > 1 ? "No more results" : "No results yet"}
          description="Completed tests appear here with your score, time and XP."
          action={
            <Button asChild>
              <Link href="/tests">Take today’s tests</Link>
            </Button>
          }
        />
      ) : (
        <>
          <AttemptList rows={rows.slice(0, PAGE_SIZE)} />
          <div className="flex justify-between">
            {page > 1 ? (
              <Button asChild variant="outline">
                <Link href={href({ page: String(page - 1) })}>Newer</Link>
              </Button>
            ) : (
              <span />
            )}
            {hasMore && (
              <Button asChild variant="outline">
                <Link href={href({ page: String(page + 1) })}>
                  Older <ArrowRight />
                </Link>
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
