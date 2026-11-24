import { Flame, Zap } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { BadgeIcon } from "@/components/badges/badge-tile";
import { ActivityHeatmap } from "@/components/dashboard/widgets";
import { Card, CardContent, SectionHeading } from "@/components/ui/card";
import { Progress, Ring } from "@/components/ui/progress";
import { PageSkeleton } from "@/components/ui/skeleton";
import { BADGES, TIER_STYLES, levelTitle } from "@/lib/gamification";
import { getActivity, getStats } from "@/lib/services/analytics";
import { badgeTrackOf, getBadgeContext } from "@/lib/services/badges";
import { getCourseConfig } from "@/lib/catalog/server";
import { trackFromUser } from "@/lib/catalog/shared";
import { requireUser } from "@/lib/session";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Achievements" };

export default function AchievementsPage() {
  return (
    <>
      <PageHeader title="Achievements" />
      <Suspense fallback={<PageSkeleton />}>
        <Achievements />
      </Suspense>
    </>
  );
}

async function Achievements() {
  const user = await requireUser();
  const [stats, { ctx, owned }, activity] = await Promise.all([getStats(user.id), getBadgeContext(user.id, badgeTrackOf(await getCourseConfig(trackFromUser(user)))), getActivity(user.id, 84)]);
  const earnedCount = BADGES.filter((b) => owned.has(b.id)).length;
  const sorted = [...BADGES].sort((a, b) => Number(owned.has(b.id)) - Number(owned.has(a.id)));
  const nextTitles = [3, 6, 10, 15, 20].filter((l) => l > stats.level.level).slice(0, 1);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col items-center gap-6 sm:flex-row">
            <Ring value={stats.level.progress} size={148} stroke={12}>
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground">Level</p>
                <p className="font-display text-5xl font-bold tabular">{stats.level.level}</p>
              </div>
            </Ring>
            <div className="w-full text-center sm:text-left">
              <p className="text-sm font-semibold text-brand-ink">{stats.level.title}</p>
              <p className="mt-1 font-display text-3xl font-bold tracking-tight tabular">{stats.xp.toLocaleString("en-IN")} XP</p>
              <Progress value={stats.level.current} max={stats.level.needed} className="mt-4 h-2" label="Progress to next level" />
              <p className="mt-2 text-sm text-muted-foreground">
                {stats.level.needed - stats.level.current} XP to level {stats.level.level + 1}
                {nextTitles[0] ? ` · “${levelTitle(nextTitles[0])}” at level ${nextTitles[0]}` : ""}
              </p>
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-muted-foreground">
                <Zap className="size-3.5 text-brand-ink" /> Daily test: 10 XP per correct answer + 20 completion bonus
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="mb-5 flex items-center gap-4">
              <span className={cn("grid size-14 place-items-center rounded-2xl", stats.currentStreak ? "bg-orange-500/12 text-orange-600 dark:text-orange-400" : "bg-surface-2 text-muted-foreground")}>
                <Flame className="size-7" />
              </span>
              <div>
                <p className="font-display text-3xl font-bold tabular">
                  {stats.currentStreak} day{stats.currentStreak === 1 ? "" : "s"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Current streak · best {stats.longestStreak} day{stats.longestStreak === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <ActivityHeatmap days={activity} />
          </CardContent>
        </Card>
      </div>

      <section>
        <SectionHeading title="Badges" description={`${earnedCount} of ${BADGES.length} collected`} />
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((b) => {
            const earned = owned.has(b.id);
            const [cur, goal] = b.progress(ctx);
            const tier = TIER_STYLES[b.tier];
            return (
              <li key={b.id} className={cn("flex items-center gap-4 rounded-2xl border bg-surface p-4", earned ? "border-border" : "border-dashed border-border-strong")}>
                <BadgeIcon badge={b} earned={earned} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn("truncate font-semibold", !earned && "text-muted-foreground")}>{b.name}</p>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", earned ? tier.text : "text-muted-foreground/70")}>{tier.label}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{b.description}</p>
                  {earned ? (
                    <p className="mt-1.5 text-xs font-medium text-success">Earned {formatDate(owned.get(b.id)!, { year: "numeric" })}</p>
                  ) : goal > 1 ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={cur} max={goal} className="h-1.5" barClassName="bg-muted-foreground/50" />
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular">
                        {cur}/{goal}
                      </span>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
