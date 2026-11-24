import { Crown, School, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkTabs } from "@/components/ui/link-tabs";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { getLeaderboard, getMyRank, type LeaderRow, type LeaderboardPeriod, type LeaderboardScope } from "@/lib/services/leaderboard";
import { requireLearner } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leaderboard" };

export default function LeaderboardPage(props: PageProps<"/leaderboard">) {
  return (
    <>
      <PageHeader title="Leaderboard" />
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-10 w-80" />
            <div className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
            <CardSkeleton lines={6} />
          </div>
        }
      >
        <Board searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

const MEDALS = [
  { ring: "ring-amber-400", tile: "bg-amber-400 text-amber-950", label: "1st" },
  { ring: "ring-slate-300 dark:ring-slate-400", tile: "bg-slate-300 text-slate-900", label: "2nd" },
  { ring: "ring-orange-400", tile: "bg-orange-400 text-orange-950", label: "3rd" },
];

async function Board({ searchParams }: { searchParams: PageProps<"/leaderboard">["searchParams"] }) {
  const { user, config } = await requireLearner();
  const sp = await searchParams;
  const period: LeaderboardPeriod = sp.period === "all" ? "all" : "week";
  const scope: LeaderboardScope = sp.scope === "school" ? "school" : "india";
  const opts = { period, scope, cohort: config.cohort.key, school: user.school };
  const [rows, mine] = await Promise.all([getLeaderboard(opts), getMyRank(user.id, opts)]);

  const href = (patch: Partial<{ period: string; scope: string }>) => {
    const p = new URLSearchParams();
    const merged = { period: period === "week" ? undefined : period, scope: scope === "india" ? undefined : scope, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/leaderboard${s ? `?${s}` : ""}`;
  };

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const meInList = rows.some((r) => r.userId === user.id);

  return (
    <div className="space-y-6 animate-fade-up">
      <p className="-mt-2 text-sm text-muted-foreground">
        Competing with <span className="font-medium text-foreground">{config.cohort.label}</span> students across all boards.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <LinkTabs
          active={period}
          tabs={[
            { value: "week", label: "This week", href: href({ period: undefined }) },
            { value: "all", label: "All time", href: href({ period: "all" }) },
          ]}
        />
        <LinkTabs
          active={scope}
          tabs={[
            { value: "india", label: "All India", href: href({ scope: undefined }) },
            {
              value: "school",
              label: (
                <>
                  <School className="size-4" /> My school
                </>
              ),
              href: href({ scope: "school" }),
            },
          ]}
        />
      </div>

      {scope === "school" && user.school && (
        <p className="text-sm text-muted-foreground">
          Showing students from <span className="font-medium text-foreground">{user.school}</span>.{" "}
          <Link href="/profile" className="text-brand-ink hover:underline">
            Change school
          </Link>
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={period === "week" ? "No one’s on the board this week yet" : "The board is empty"}
          description="Finish a test to earn XP and claim the top spot."
          action={
            <Button asChild>
              <Link href="/tests">Take a test</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ol className="grid items-end gap-4 sm:grid-cols-3">
            {[1, 0, 2].map((i) => {
              const r = podium[i];
              if (!r) return <li key={i} className="hidden sm:block" />;
              const m = MEDALS[i];
              return (
                <li
                  key={r.userId}
                  className={cn(
                    "flex flex-col items-center rounded-2xl border bg-surface p-5 text-center",
                    i === 0 && "order-first border-amber-400/50 sm:order-none sm:pb-8 sm:pt-7",
                    r.userId === user.id ? "border-brand/50" : i !== 0 && "border-border",
                  )}
                >
                  <div className="relative">
                    {i === 0 && <Crown className="absolute -top-6 left-1/2 size-6 -translate-x-1/2 fill-amber-400 text-amber-400" />}
                    <Avatar name={r.name} src={r.image} size={i === 0 ? "xl" : "lg"} className={cn("ring-4", m.ring)} />
                    <span className={cn("absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[11px] font-bold", m.tile)}>{m.label}</span>
                  </div>
                  <p className="mt-5 max-w-full truncate font-semibold">
                    {r.name}
                    {r.userId === user.id && <span className="ml-1 text-xs font-medium text-brand-ink">(you)</span>}
                  </p>
                  <p className="max-w-full truncate text-xs text-muted-foreground">{r.school ?? r.city ?? "—"}</p>
                  <p className="mt-3 font-display text-2xl font-bold tabular">{r.xp.toLocaleString("en-IN")} XP</p>
                  <p className="text-xs text-muted-foreground">
                    {r.tests} tests · {r.avgScore}% avg
                  </p>
                </li>
              );
            })}
          </ol>

          {rest.length > 0 && <Table rows={rest} me={user.id} />}

          {!meInList && (
            <div className="rounded-2xl border border-brand/40 bg-brand-soft p-4 text-sm">
              {mine ? (
                <p>
                  You’re <span className="font-semibold">#{mine.rank}</span> with{" "}
                  <span className="font-semibold">{mine.xp.toLocaleString("en-IN")} XP</span>. Keep going to break into the top 50!
                </p>
              ) : (
                <p>
                  You’re not on this board yet.{" "}
                  <Link href="/tests" className="font-medium text-brand-ink hover:underline">
                    Take a test
                  </Link>{" "}
                  to earn XP.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Table({ rows, me }: { rows: LeaderRow[]; me: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="grid grid-cols-[3rem_1fr_auto] gap-4 border-b border-border bg-surface-2 px-4 py-2.5 text-xs font-medium text-muted-foreground sm:grid-cols-[3rem_1fr_6rem_6rem_7rem] sm:px-5">
        <span>Rank</span>
        <span>Student</span>
        <span className="hidden text-right sm:block">Tests</span>
        <span className="hidden text-right sm:block">Avg score</span>
        <span className="text-right">XP</span>
      </div>
      <ol className="divide-y divide-border">
        {rows.map((r) => (
          <li
            key={r.userId}
            className={cn(
              "grid grid-cols-[3rem_1fr_auto] items-center gap-4 px-4 py-3 sm:grid-cols-[3rem_1fr_6rem_6rem_7rem] sm:px-5",
              r.userId === me && "bg-brand-soft",
            )}
          >
            <span className="font-mono text-sm font-semibold text-muted-foreground tabular">#{r.rank}</span>
            <span className="flex min-w-0 items-center gap-3">
              <Avatar name={r.name} src={r.image} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {r.name}
                  {r.userId === me && <span className="ml-1 text-xs text-brand-ink">(you)</span>}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{r.school ?? r.city ?? "—"}</span>
              </span>
            </span>
            <span className="hidden text-right text-sm tabular sm:block">{r.tests}</span>
            <span className="hidden text-right text-sm tabular sm:block">{r.avgScore}%</span>
            <span className="text-right font-semibold tabular">{r.xp.toLocaleString("en-IN")}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
