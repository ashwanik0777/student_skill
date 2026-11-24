import { ArrowRight, ArrowUpRight, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { SubjectChip, SubjectIcon } from "@/components/subject-badge";
import { Progress } from "@/components/ui/progress";
import { getCatalog } from "@/lib/catalog/server";
import { subjectName, subjectOf } from "@/lib/catalog/shared";
import { toneFor } from "@/lib/catalog/icons";
import { cn, formatDate, scoreTone } from "@/lib/utils";

export function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  iconClassName,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  iconClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("grid size-8 place-items-center rounded-lg bg-surface-2 text-muted-foreground", iconClassName)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-[1.7rem] font-bold leading-none tracking-tight tabular">{value}</p>
      {sub && <p className="mt-2 text-xs text-muted-foreground">{sub}</p>}
      {children}
    </div>
  );
}

function weekday(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sun
}

/** GitHub-style grid: one column per week (Mon → Sun), oldest week on the left. */
export function ActivityHeatmap({ days }: { days: { day: string; count: number }[] }) {
  const lead = (weekday(days[0].day) + 6) % 7; // rows start on Monday
  const cells: ({ day: string; count: number } | null)[] = [...Array(lead).fill(null), ...days];
  const active = days.filter((d) => d.count > 0).length;
  const tone = (n: number) =>
    n === 0 ? "bg-surface-3" : n === 1 ? "bg-brand/30" : n === 2 ? "bg-brand/55" : n <= 4 ? "bg-brand/80" : "bg-brand";
  return (
    <div>
      {/* One fluid grid: first column holds the weekday labels, every other column is a week. */}
      <div className="grid max-w-sm auto-cols-fr grid-flow-col grid-rows-7 gap-[3px] sm:gap-1">
        {["M", "", "W", "", "F", "", "S"].map((d, i) => (
          <span key={`label-${i}`} aria-hidden className="grid aspect-square place-items-center text-[10px] leading-none text-muted-foreground">
            {d}
          </span>
        ))}
        {cells.map((c, i) =>
          c ? (
            <span
              key={c.day}
              title={`${formatDate(c.day, { weekday: "short" })}: ${c.count} test${c.count === 1 ? "" : "s"}`}
              className={cn("aspect-square w-full rounded-[4px]", tone(c.count))}
            />
          ) : (
            <span key={`pad-${i}`} className="aspect-square w-full" />
          ),
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {active} active {active === 1 ? "day" : "days"} in {Math.round(days.length / 7)} weeks
        </span>
        <span className="flex items-center gap-1">
          Less
          {[0, 1, 2, 3, 5].map((n) => (
            <span key={n} className={cn("size-2.5 rounded-[3px]", tone(n))} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}

export async function SubjectMastery({
  rows,
}: {
  rows: { subject: string; name: string; tests: number; avgScore: number; accuracy: number }[];
}) {
  const cat = await getCatalog();
  return (
    <ul className="space-y-4">
      {rows.map((r) => {
        const s = subjectOf(cat, r.subject);
        return (
          <li key={r.subject} className="flex items-center gap-3">
            <SubjectIcon subject={r.subject} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{r.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular">
                  {r.tests ? `${r.avgScore}% avg · ${r.tests} tests` : "No tests yet"}
                </span>
              </div>
              <Progress value={r.avgScore} className="mt-1.5 h-1.5" barClassName={s ? toneFor(s.tone).solid : undefined} label={`${r.name} average`} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export async function FocusAreas({ weak }: { weak: { subject: string; chapter: string; accuracy: number; total: number }[] }) {
  const cat = await getCatalog();
  if (!weak.length) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong px-4 py-8 text-center text-sm text-muted-foreground">
        Take a few tests and we’ll pinpoint the chapters that need attention.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {weak.slice(0, 4).map((w) => (
        <li key={`${w.subject}-${w.chapter}`}>
          <Link
            href={`/practice?subject=${w.subject}&chapter=${encodeURIComponent(w.chapter)}`}
            className="group flex items-center gap-3 rounded-xl border border-border px-3.5 py-3 transition-colors hover:border-border-strong hover:bg-surface-2"
          >
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-mono text-xs font-bold tabular", scoreTone(w.accuracy).soft)}>
              {w.accuracy}%
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{w.chapter}</span>
              <span className="block text-xs text-muted-foreground">
                {subjectName(cat, w.subject)} · {w.total} questions answered
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-ink opacity-80 group-hover:opacity-100">
              Practise <ArrowUpRight className="size-3.5" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function RecentResults({
  rows,
}: {
  rows: { attemptId: string; title: string; subject: string; score: number | null; completedAt: Date | null; kind: string }[];
}) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong px-4 py-8 text-center text-sm text-muted-foreground">
        Your completed tests will show up here.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.attemptId}>
          <Link href={`/results/${r.attemptId}`} className="flex items-center gap-3 py-3 transition-opacity hover:opacity-80">
            <SubjectIcon subject={r.subject} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.completedAt ? formatDate(r.completedAt, { hour: "numeric", minute: "2-digit" }) : ""}</p>
            </div>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold tabular", scoreTone(r.score ?? 0).soft)}>{r.score ?? 0}%</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function TutorPrompt({ prompts }: { prompts: string[] }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-brand-soft-border bg-brand-soft p-5 sm:p-6">
      <div className="flex items-center gap-2 text-brand-ink">
        <Sparkles className="size-4" />
        <p className="text-sm font-semibold">Ask your AI tutor</p>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Stuck on something? Get a step-by-step explanation in seconds.</p>
      <div className="mt-4 flex flex-col gap-2">
        {prompts.map((p) => (
          <Link
            key={p}
            href={`/tutor?q=${encodeURIComponent(p)}`}
            className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm transition-colors hover:border-brand/40"
          >
            <span className="line-clamp-1">{p}</span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand-ink" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export { SubjectChip };
