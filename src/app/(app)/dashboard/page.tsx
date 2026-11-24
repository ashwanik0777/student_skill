import { ArrowRight, Flame, GraduationCap, Rocket, Sparkles, Target, Trophy, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { DashboardAnnouncements } from "@/components/dashboard/announcements";
import {
  ActivityHeatmap,
  FocusAreas,
  RecentResults,
  StatTile,
  SubjectMastery,
  TutorPrompt,
} from "@/components/dashboard/widgets";
import { SundayCard, TodayTestList } from "@/components/tests/today-tests";
import { Button } from "@/components/ui/button";
import { Card, CardContent, SectionHeading } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageSkeleton, Skeleton } from "@/components/ui/skeleton";
import { getActivity, getStats, getSubjectPerformance, getTopics, getWeeklyXp } from "@/lib/services/analytics";
import { getMyRank } from "@/lib/services/leaderboard";
import { getTodayTests, listAttempts } from "@/lib/services/tests";
import { suggestedPrompts } from "@/lib/catalog/prompts";
import { getTrackRules } from "@/lib/catalog/rules";
import { getCatalogLite } from "@/lib/catalog/server";
import { nextStepLabel, subjectName } from "@/lib/catalog/shared";
import { getSettings } from "@/lib/settings";
import { requireLearner } from "@/lib/session";
import { cn, formatDate, greeting } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage(props: PageProps<"/dashboard">) {
  return (
    <Suspense
      fallback={
        <>
          <div className="mb-8 space-y-3">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-5 w-96 max-w-full" />
          </div>
          <PageSkeleton />
        </>
      }
    >
      <Dashboard searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const { user, track, config } = await requireLearner();
  const [{ welcome }, cat, settings, today, stats, weeklyXp, activity, subjects, topics, recent, rank] = await Promise.all([
    searchParams,
    getCatalogLite(),
    getSettings(),
    getTodayTests(user.id, config),
    getStats(user.id),
    getWeeklyXp(user.id),
    getActivity(user.id, 84),
    getSubjectPerformance(user.id, config),
    getTopics(user.id, config.key),
    listAttempts(user.id, { limit: 5, trackKey: config.key }),
    getMyRank(user.id, { period: "all", scope: "india", cohort: config.cohort.key }),
  ]);

  const firstName = user.name.split(" ")[0];
  const nextUp = today.items.find((i) => i.status !== "completed");
  const now = new Date();
  const rules = getTrackRules(cat, settings.rules, { track, onboardedAt: user.onboardedAt, trackSetAt: user.trackSetAt, lastPromotedAt: user.lastPromotedAt }, now);
  const nextStep = nextStepLabel(cat, track);
  const windowEnds = formatDate(new Date(rules.window.end.getTime() - 1));

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            {formatDate(now, { weekday: "long", day: "numeric", month: "long" })}
            <Link
              href="/course"
              className="inline-flex items-center gap-1 rounded-full border border-brand-soft-border bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand-ink hover:bg-brand-soft-border"
            >
              <GraduationCap className="size-3.5" /> {config.label}
            </Link>
          </span>
        }
        title={`${greeting(now)}, ${firstName}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/practice">
                <Sparkles /> AI practice
              </Link>
            </Button>
            {nextUp?.testId ? (
              <Button asChild>
                <Link href={`/test/${nextUp.testId}`}>
                  Continue {nextUp.title} <ArrowRight />
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <Suspense fallback={null}>
        <DashboardAnnouncements cohort={config.cohort.key} />
      </Suspense>

      {rules.promotion.available && nextStep && (
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-brand-soft-border bg-brand-soft p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white">
              <Rocket className="size-5" />
            </span>
            <div className="text-sm">
              <p className="font-semibold">Done with {config.short}? Move up to {nextStep}.</p>
              <p className="mt-0.5 text-muted-foreground">Same account — your XP, streak, badges and history come with you. Open until {windowEnds}.</p>
            </div>
          </div>
          <Button asChild>
            <Link href="/course">
              Move up <ArrowRight />
            </Link>
          </Button>
        </div>
      )}

      {welcome && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-success/25 bg-success-soft p-4 text-sm animate-pop">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-success" />
          <p>
            <span className="font-semibold">You’re all set!</span> Your profile is ready. Take your first daily test to start
            your streak and unlock the <span className="font-semibold">First Step</span> badge.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile
          icon={Flame}
          label="Streak"
          value={`${stats.currentStreak} ${stats.currentStreak === 1 ? "day" : "days"}`}
          sub={stats.activeToday ? "Done for today ✓" : stats.currentStreak ? "Take a test today to keep it" : `Best: ${stats.longestStreak} days`}
          iconClassName={cn(stats.currentStreak > 0 && "bg-orange-500/12 text-orange-600 dark:text-orange-400")}
        />
        <StatTile
          icon={Zap}
          label={`Level ${stats.level.level} · ${stats.level.title}`}
          value={`${stats.xp.toLocaleString("en-IN")} XP`}
          iconClassName="bg-brand-soft text-brand-ink"
        >
          <Progress value={stats.level.current} max={stats.level.needed} className="mt-3 h-1.5" label="Level progress" />
          <p className="mt-1.5 text-xs text-muted-foreground tabular">
            {stats.level.needed - stats.level.current} XP to level {stats.level.level + 1}
          </p>
        </StatTile>
        <StatTile
          icon={Target}
          label="Accuracy"
          value={`${stats.accuracy}%`}
          sub={`${stats.correctAnswers} of ${stats.questionsAnswered} answers correct`}
          iconClassName="bg-success-soft text-success"
        />
        <StatTile
          icon={Trophy}
          label="This week"
          value={`${weeklyXp.toLocaleString("en-IN")} XP`}
          sub={rank ? `${config.cohort.label} rank #${rank.rank}` : "Earn XP to join the leaderboard"}
          iconClassName="bg-warning-soft text-warning"
        />
      </div>

      {/* Today + activity */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card>
          <CardContent>
            <SectionHeading
              title="Today’s tests"
              action={
                <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold tabular">
                  {today.completed}/{today.items.length} done
                </span>
              }
            />
            <Progress value={today.completed} max={today.items.length} className="mb-5 h-1.5" barClassName="bg-success" label="Daily tests completed" />
            <TodayTestList items={today.items} />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent>
              <SectionHeading title="Activity" />
              <ActivityHeatmap days={activity} />
            </CardContent>
          </Card>
          <SundayCard item={today.sunday} isSunday={today.isSunday} weekly={today.weekly} />
        </div>
      </div>

      {/* Mastery + focus */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardContent>
            <SectionHeading
              title="Subject mastery"
              description="Average score per subject"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/insights">
                    Insights <ArrowRight />
                  </Link>
                </Button>
              }
            />
            <SubjectMastery rows={subjects} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <SectionHeading title="Focus areas" />
            <FocusAreas weak={topics.weak} />
          </CardContent>
        </Card>
      </div>

      {/* Recent + tutor */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardContent>
            <SectionHeading
              title="Recent results"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/tests?tab=history">
                    All results <ArrowRight />
                  </Link>
                </Button>
              }
            />
            <RecentResults rows={recent} />
          </CardContent>
        </Card>
        <TutorPrompt prompts={suggestedPrompts(config, (slug) => subjectName(cat, slug), topics.weak[0], 4).map((p) => p.text).slice(0, 3)} />
      </div>
    </div>
  );
}
