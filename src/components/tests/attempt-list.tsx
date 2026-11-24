import { ChevronRight, CloudOff, ShieldAlert, Timer, Zap } from "lucide-react";
import Link from "next/link";
import { SubjectIcon } from "@/components/subject-badge";
import { cn, formatDate, formatDuration, scoreTone } from "@/lib/utils";

type Row = {
  attemptId: string;
  title: string;
  kind: string;
  subject: string;
  score: number | null;
  correct: number;
  total: number;
  xpEarned: number;
  timeTakenSec: number | null;
  endReason: string | null;
  completedAt: Date | null;
};

const KIND_LABEL: Record<string, string> = { daily: "Daily", sunday: "Sunday", practice: "Practice" };

export function AttemptList({ rows }: { rows: Row[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {rows.map((r) => {
        const tone = scoreTone(r.score ?? 0);
        return (
          <li key={r.attemptId}>
            <Link href={`/results/${r.attemptId}`} className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-2 sm:px-5">
              <SubjectIcon subject={r.subject} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium">
                  {r.title}
                  {r.endReason === "tab_switch" && <ShieldAlert className="size-3.5 shrink-0 text-warning" aria-label="Auto-submitted" />}
                  {r.endReason === "time_up" && <Timer className="size-3.5 shrink-0 text-muted-foreground" aria-label="Time up" />}
                  {r.endReason === "offline" && <CloudOff className="size-3.5 shrink-0 text-brand-ink" aria-label="Taken offline" />}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-medium">{KIND_LABEL[r.kind] ?? r.kind}</span>
                  <span>{r.completedAt ? formatDate(r.completedAt, { hour: "numeric", minute: "2-digit" }) : ""}</span>
                  <span className="tabular">
                    {r.correct}/{r.total} correct
                  </span>
                  {r.timeTakenSec ? <span className="hidden sm:inline">{formatDuration(r.timeTakenSec)}</span> : null}
                </p>
              </div>
              <span className="hidden items-center gap-1 text-xs font-medium text-brand-ink sm:inline-flex">
                <Zap className="size-3.5" />+{r.xpEarned}
              </span>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold tabular", tone.soft)}>{r.score ?? 0}%</span>
              <ChevronRight className="hidden size-4 text-muted-foreground sm:block" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
