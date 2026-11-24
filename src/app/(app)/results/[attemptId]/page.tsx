import { ArrowLeft, Check, CloudOff, Clock, Minus, ShieldAlert, Sparkles, Timer, X, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { BadgeIcon } from "@/components/badges/badge-tile";
import { AiFeedback } from "@/components/results/ai-feedback";
import { QuestionReview } from "@/components/results/question-review";
import { SubjectChip } from "@/components/subject-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress, Ring } from "@/components/ui/progress";
import { PageSkeleton } from "@/components/ui/skeleton";
import { BADGE_MAP, TIER_STYLES } from "@/lib/gamification";
import { getAttemptResult } from "@/lib/services/tests";
import { requireUser } from "@/lib/session";
import { cn, formatDate, formatDuration, scoreTone } from "@/lib/utils";

export const metadata: Metadata = { title: "Result" };

export default function ResultPage(props: PageProps<"/results/[attemptId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Result params={props.params} />
    </Suspense>
  );
}

const REASONS = {
  tab_switch: {
    icon: ShieldAlert,
    title: "Submitted automatically",
    body: "You left the exam window, so the test ended early. Stay in full screen next time for the full completion bonus.",
    className: "border-warning/30 bg-warning-soft",
    iconClass: "text-warning",
  },
  time_up: {
    icon: Timer,
    title: "Time’s up",
    body: "The timer ran out and your answers were submitted automatically.",
    className: "border-border bg-surface-2",
    iconClass: "text-muted-foreground",
  },
  offline: {
    icon: CloudOff,
    title: "Taken offline",
    body: "This test was completed offline and synced when you reconnected.",
    className: "border-brand-soft-border bg-brand-soft",
    iconClass: "text-brand-ink",
  },
} as const;

async function Result({ params }: { params: PageProps<"/results/[attemptId]">["params"] }) {
  const user = await requireUser();
  const { attemptId } = await params;
  const data = await getAttemptResult(user.id, attemptId);
  if (!data) notFound();
  const { attempt, test, questions } = data;
  if (attempt.status !== "completed") redirect(`/test/${test.id}`);

  const score = attempt.score ?? 0;
  const tone = scoreTone(score);
  const reason = attempt.endReason && attempt.endReason !== "submitted" ? REASONS[attempt.endReason] : null;

  const chapters = new Map<string, { total: number; correct: number; subject: string }>();
  for (const q of questions) {
    const c = chapters.get(q.chapter) ?? { total: 0, correct: 0, subject: q.subject };
    c.total++;
    if (q.isCorrect) c.correct++;
    chapters.set(q.chapter, c);
  }
  const breakdown = [...chapters.entries()]
    .map(([chapter, c]) => ({ chapter, ...c, pct: Math.round((c.correct / c.total) * 100) }))
    .sort((a, b) => a.pct - b.pct);
  const weakest = breakdown.find((b) => b.pct < 100);

  const newBadges = attempt.newBadges.map((id) => BADGE_MAP[id]).filter(Boolean);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <SubjectChip subject={test.subject} />
            <span className="text-muted-foreground">{formatDate(attempt.completedAt!, { hour: "numeric", minute: "2-digit" })}</span>
          </span>
        }
        title={test.title}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/tests">
                <ArrowLeft /> All tests
              </Link>
            </Button>
            {weakest && test.subject !== "mixed" && (
              <Button asChild>
                <Link href={`/practice?subject=${test.subject}&chapter=${encodeURIComponent(weakest.chapter)}`}>
                  <Sparkles /> Practise weak chapter
                </Link>
              </Button>
            )}
          </>
        }
      />

      {reason && (
        <div className={cn("mb-6 flex items-start gap-3 rounded-2xl border p-4", reason.className)}>
          <reason.icon className={cn("mt-0.5 size-5 shrink-0", reason.iconClass)} />
          <div className="text-sm">
            <p className="font-semibold">{reason.title}</p>
            <p className="mt-0.5 text-muted-foreground">{reason.body}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <Card>
          <CardContent className="flex flex-col items-center text-center">
            <Ring value={score} size={168} stroke={14} barClassName={tone.text}>
              <div>
                <p className="font-display text-5xl font-bold tracking-tight tabular">{score}%</p>
                <p className={cn("mt-1 text-sm font-semibold", tone.text)}>{tone.label}</p>
              </div>
            </Ring>
            <div className="mt-6 grid w-full grid-cols-4 gap-2">
              {[
                { icon: Check, label: "Correct", value: attempt.correct, cls: "text-success" },
                { icon: X, label: "Wrong", value: attempt.wrong, cls: "text-danger" },
                { icon: Minus, label: "Skipped", value: attempt.skipped, cls: "text-muted-foreground" },
                { icon: Clock, label: "Time", value: formatDuration(attempt.timeTakenSec ?? 0), cls: "text-foreground" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-surface-2 px-1 py-3">
                  <s.icon className={cn("mx-auto size-4", s.cls)} />
                  <p className="mt-1 text-base font-semibold tabular">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-sm font-semibold text-brand-ink">
              <Zap className="size-4" /> +{attempt.xpEarned} XP earned
            </div>
            {newBadges.length > 0 && (
              <div className="mt-6 w-full border-t border-border pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New badges unlocked</p>
                <ul className="mt-3 flex flex-wrap justify-center gap-4">
                  {newBadges.map((b) => (
                    <li key={b.id} className="flex w-24 flex-col items-center gap-2 animate-pop">
                      <BadgeIcon badge={b} />
                      <span className="text-xs font-medium leading-tight">{b.name}</span>
                      <span className={cn("text-[10px] font-semibold uppercase", TIER_STYLES[b.tier].text)}>{TIER_STYLES[b.tier].label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold">Chapter breakdown</h2>
            <p className="text-sm text-muted-foreground">How you did in each chapter in this test.</p>
            <ul className="mt-5 space-y-4">
              {breakdown.map((b) => (
                <li key={b.chapter}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium" title={b.chapter}>
                      {b.chapter}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular">
                      {b.correct}/{b.total} · {b.pct}%
                    </span>
                  </div>
                  <Progress
                    value={b.pct}
                    className="mt-1.5 h-2"
                    barClassName={b.pct >= 80 ? "bg-success" : b.pct >= 50 ? "bg-warning" : "bg-danger"}
                    label={`${b.chapter} accuracy`}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <AiFeedback attemptId={attempt.id} initial={attempt.feedback ?? null} />
      </div>

      <div className="mt-10">
        <QuestionReview
          questions={questions.map((q) => ({
            id: q.id,
            position: q.position,
            chapter: q.chapter,
            topic: q.topic,
            text: q.text,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            selectedIndex: q.selectedIndex,
            isCorrect: q.isCorrect,
            timeSpentSec: q.timeSpentSec,
          }))}
        />
      </div>
    </div>
  );
}
