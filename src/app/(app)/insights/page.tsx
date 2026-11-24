import { ArrowUpRight, CalendarDays, ChartLine, Check, Clock, ClipboardList, Gauge, Lightbulb, Target, TrendingDown, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { StatTile } from "@/components/dashboard/widgets";
import { ScoreTrendChart, SubjectBarChart } from "@/components/insights/charts";
import { InsightsButton, StudyPlanButton } from "@/components/insights/report-buttons";
import { SubjectIcon } from "@/components/subject-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, SectionHeading } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";
import { getLatestReport, getScoreTrend, getStats, getSubjectPerformance, getTopics, getTotals } from "@/lib/services/analytics";
import { toneFor } from "@/lib/catalog/icons";
import { getCatalogLite } from "@/lib/catalog/server";
import { subjectName, subjectOf, type CatalogLite } from "@/lib/catalog/shared";
import { requireLearner } from "@/lib/session";
import { cn, formatDuration, scoreTone, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Insights" };

export default function InsightsPage() {
  return (
    <>
      <PageHeader title="Insights" />
      <Suspense fallback={<PageSkeleton />}>
        <Insights />
      </Suspense>
    </>
  );
}

async function Insights() {
  const { user, config } = await requireLearner();
  const [cat, stats, totals, trend, subjects, topics, insights, plan] = await Promise.all([
    getCatalogLite(),
    getStats(user.id),
    getTotals(user.id, config.key),
    getScoreTrend(user.id, config.key, 20),
    getSubjectPerformance(user.id, config),
    getTopics(user.id, config.key),
    getLatestReport(user.id, "insights"),
    getLatestReport(user.id, "study_plan"),
  ]);

  if (totals.tests === 0) {
    return (
      <EmptyState
        icon={ChartLine}
        title="Your insights will appear here"
        description="Complete a couple of tests and we’ll chart your progress, find your weak chapters and build you a study plan."
        action={
          <Button asChild>
            <Link href="/tests">Take your first test</Link>
          </Button>
        }
      />
    );
  }

  const half = Math.floor(trend.length / 2);
  const firstHalf = trend.slice(0, half);
  const secondHalf = trend.slice(half);
  const avg = (xs: { score: number }[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x.score, 0) / xs.length) : 0);
  const delta = trend.length >= 4 ? avg(secondHalf) - avg(firstHalf) : null;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile icon={ClipboardList} label="Tests completed" value={totals.tests} sub={`Best score: ${totals.best}%`} iconClassName="bg-brand-soft text-brand-ink" />
        <StatTile
          icon={Gauge}
          label="Average score"
          value={`${totals.avgScore}%`}
          sub={
            delta === null ? (
              "Take more tests to see your trend"
            ) : (
              <span className={cn("inline-flex items-center gap-1 font-medium", delta >= 0 ? "text-success" : "text-danger")}>
                {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {delta >= 0 ? "+" : ""}
                {delta}% vs earlier tests
              </span>
            )
          }
          iconClassName="bg-success-soft text-success"
        />
        <StatTile icon={Target} label="Accuracy" value={`${stats.accuracy}%`} sub={`${stats.questionsAnswered} questions answered`} iconClassName="bg-warning-soft text-warning" />
        <StatTile icon={Clock} label="Time practised" value={formatDuration(totals.timeSec)} sub="Across all tests" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardContent>
            <SectionHeading title="Score trend" description={`Your last ${trend.length} tests`} />
            <ScoreTrendChart data={trend} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <SectionHeading title="By subject" />
            <SubjectBarChart
              data={subjects.map((s) => ({
                name: s.name,
                short: subjectOf(cat, s.subject)?.short ?? s.subject,
                avgScore: s.avgScore,
                tests: s.tests,
                color: toneFor(subjectOf(cat, s.subject)?.tone).hex,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardContent>
            <SectionHeading
              title="AI insights"
              description={insights ? `Updated ${timeAgo(insights.createdAt)}` : "A coach’s read on your performance so far"}
              action={<InsightsButton hasReport={!!insights} />}
            />
            {insights ? (
              <div className="space-y-5">
                <div className="rounded-2xl bg-brand-soft p-4">
                  <p className="font-display text-lg font-semibold text-brand-ink">{insights.data.headline}</p>
                  <p className="mt-1.5 text-sm leading-relaxed">{insights.data.overview}</p>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Strengths</p>
                    <ul className="mt-3 space-y-2">
                      {insights.data.strengths.map((s) => (
                        <li key={s} className="flex gap-2 text-sm">
                          <Check className="mt-0.5 size-4 shrink-0 text-success" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommendations</p>
                    <ul className="mt-3 space-y-2">
                      {insights.data.recommendations.map((s) => (
                        <li key={s} className="flex gap-2 text-sm">
                          <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {insights.data.weaknesses.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Work on</p>
                    <ul className="mt-3 grid gap-2 md:grid-cols-2">
                      {insights.data.weaknesses.map((w) => (
                        <li key={w.topic} className="rounded-xl border border-border p-3.5 text-sm">
                          <p className="font-medium">{w.topic}</p>
                          <p className="text-xs text-muted-foreground">{w.subject}</p>
                          <p className="mt-1.5 text-muted-foreground">{w.advice}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border-strong px-4 py-8 text-center text-sm text-muted-foreground">
                Generate a personalised report based on all your tests so far.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SectionHeading title="Chapters" />
            <ChapterList cat={cat} title="Needs work" icon={TrendingDown} rows={topics.weak} empty="No weak chapters yet — great going!" practice />
            <div className="my-5 h-px bg-border" />
            <ChapterList cat={cat} title="Strongest" icon={TrendingUp} rows={topics.strong} empty="Keep practising to build strong chapters." />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <SectionHeading
            title={
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="size-5 text-brand-ink" /> 7-day study plan
              </span>
            }
            description={plan ? `${plan.data.focus} · created ${timeAgo(plan.createdAt)}` : "A realistic weekly plan built around your weak chapters"}
            action={<StudyPlanButton hasPlan={!!plan} />}
          />
          {plan ? (
            <>
              <div className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6 xl:mx-0 xl:grid xl:grid-cols-4 xl:overflow-visible xl:px-0">
                {plan.data.days.map((d) => (
                  <div key={d.day} className="w-56 shrink-0 snap-start rounded-2xl border border-border bg-background p-4 xl:w-auto">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-ink">{d.day.slice(0, 3)}</p>
                    <p className="mt-1 text-sm font-semibold leading-snug">{d.theme}</p>
                    <ul className="mt-3 space-y-2.5">
                      {d.tasks.map((t, i) => (
                        <li key={i} className="text-xs">
                          <p className="leading-relaxed">{t.activity}</p>
                          <p className="mt-0.5 text-muted-foreground">
                            {t.subject} · {t.minutes} min
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {plan.data.goals.length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-2">
                  {plan.data.goals.map((g) => (
                    <li key={g} className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success">
                      <Target className="size-3.5" /> {g}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-border-strong px-4 py-8 text-center text-sm text-muted-foreground">
              Choose how many hours you can study each day and get a plan for the whole week.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChapterList({
  cat,
  title,
  icon: Icon,
  rows,
  empty,
  practice,
}: {
  cat: CatalogLite;
  title: string;
  icon: typeof TrendingUp;
  rows: { subject: string; chapter: string; accuracy: number; total: number }[];
  empty: string;
  practice?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" /> {title}
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.slice(0, 4).map((r) => (
            <li key={`${r.subject}-${r.chapter}`} className="flex items-center gap-3">
              <SubjectIcon subject={r.subject} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.chapter}</p>
                <p className="text-xs text-muted-foreground">
                  {subjectName(cat, r.subject)} · {r.total} Qs
                </p>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular", scoreTone(r.accuracy).soft)}>{r.accuracy}%</span>
              {practice && (
                <Link
                  href={`/practice?subject=${r.subject}&chapter=${encodeURIComponent(r.chapter)}`}
                  className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-brand-ink"
                  aria-label={`Practise ${r.chapter}`}
                >
                  <ArrowUpRight className="size-4" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
