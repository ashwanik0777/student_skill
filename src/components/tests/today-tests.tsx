import { ArrowRight, CircleCheck, Clock, Hash, RotateCcw, Sun } from "lucide-react";
import Link from "next/link";
import { SubjectIcon } from "@/components/subject-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DotPattern } from "@/components/ui/dot-pattern";
import type { TodayItem } from "@/lib/services/tests";
import type { CourseConfig } from "@/lib/catalog/shared";
import { cn, scoreTone } from "@/lib/utils";
import { StartTestButton } from "./start-test-button";

function Action({ item, size = "sm" }: { item: TodayItem; size?: "sm" | "md" }) {
  if (item.status === "completed" && item.attemptId) {
    return (
      <Button asChild size={size} variant="outline">
        <Link href={`/results/${item.attemptId}`}>View result</Link>
      </Button>
    );
  }
  if ((item.status === "ready" || item.status === "in_progress") && item.testId) {
    return (
      <Button asChild size={size} variant={item.status === "in_progress" ? "soft" : "primary"}>
        <Link href={`/test/${item.testId}`}>
          {item.status === "in_progress" ? <RotateCcw /> : null}
          {item.status === "in_progress" ? "Resume" : "Start"}
        </Link>
      </Button>
    );
  }
  return <StartTestButton subject={item.subject} kind={item.kind} size={size} />;
}

export function TodayTestList({ items }: { items: TodayItem[] }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const done = item.status === "completed";
        return (
          <li key={item.key} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
            <SubjectIcon subject={item.subject} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate font-medium">
                {item.title}
                {done && <CircleCheck className="size-4 shrink-0 text-success" aria-label="Completed" />}
              </p>
              <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Hash className="size-3" />
                  {item.questionCount} questions
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {Math.round(item.durationSec / 60)} min
                </span>
              </p>
            </div>
            {done && item.score !== null && (
              <span className={cn("hidden rounded-full px-2.5 py-1 text-xs font-semibold tabular sm:inline", scoreTone(item.score).soft)}>
                {item.score}%
              </span>
            )}
            <Action item={item} />
          </li>
        );
      })}
    </ul>
  );
}

export function SundayCard({ item, isSunday, weekly }: { item: TodayItem | null; isSunday: boolean; weekly: CourseConfig["weekly"] }) {
  return (
    <div className="@container relative overflow-hidden rounded-2xl bg-zinc-950 p-5 text-white dark:border dark:border-border sm:p-6">
      <DotPattern className="text-white/[0.07]" gap={20} />
      <div className="relative flex flex-col gap-5 @lg:flex-row @lg:items-center @lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-400 text-zinc-950">
            <Sun className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-display text-lg font-semibold">{weekly.title}</p>
              {item?.status === "completed" && <Badge className="border-transparent bg-white/10 text-white">Done</Badge>}
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              {isSunday
                ? `${weekly.questions} questions · ${Math.round(weekly.durationSec / 60)} minutes · ${weekly.label}`
                : `Unlocks every Sunday — ${weekly.questions} mixed questions in ${Math.round(weekly.durationSec / 60)} minutes (${weekly.label}).`}
            </p>
          </div>
        </div>
        {isSunday && item ? (
          item.status === "completed" && item.attemptId ? (
            <Button asChild size="md" className="bg-white text-zinc-950 hover:bg-zinc-200">
              <Link href={`/results/${item.attemptId}`}>
                View result <ArrowRight />
              </Link>
            </Button>
          ) : item.testId ? (
            <Button asChild size="md" className="bg-white text-zinc-950 hover:bg-zinc-200">
              <Link href={`/test/${item.testId}`}>
                {item.status === "in_progress" ? "Resume" : "Start"} <ArrowRight />
              </Link>
            </Button>
          ) : (
            <StartTestButton kind="sunday" size="md" label="Start super test" className="bg-white text-zinc-950 hover:bg-zinc-200" />
          )
        ) : (
          <span className="inline-flex shrink-0 items-center gap-2 self-start whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-300 @lg:self-auto">
            <Clock className="size-3.5" /> Locked until Sunday
          </span>
        )}
      </div>
    </div>
  );
}
