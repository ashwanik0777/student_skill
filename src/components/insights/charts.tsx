import { cn } from "@/lib/utils";

/*
 * Server-rendered charts (no chart library, no client JavaScript). Hover tooltips are pure CSS on generous hit
 * areas, and every value is also listed in the "Show as table" view, so a tooltip never gates a number.
 */

const TICKS = [0, 25, 50, 75, 100];
const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

function Grid() {
  return (
    <>
      {TICKS.map((t) => (
        <div key={t} aria-hidden className="absolute left-8 right-0 border-t border-border" style={{ top: `${100 - t}%` }}>
          <span className="absolute -left-8 -top-2 w-6 text-right text-[11px] leading-none text-muted-foreground tabular">{t}</span>
        </div>
      ))}
    </>
  );
}

function Tooltip({ align, children }: { align: "left" | "center" | "right"; children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute bottom-full z-10 mb-1.5 hidden whitespace-nowrap rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-pop group-hover:block",
        align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2",
      )}
    >
      {children}
    </div>
  );
}

function TableView({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">Show as table</summary>
      <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-border scrollbar-thin">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-surface-2 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">{head[0]}</th>
              <th className="px-3 py-2 text-right font-medium">{head[1]}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([a, b], i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-3 py-1.5">{a}</td>
                <td className="px-3 py-1.5 text-right tabular">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

type TrendPoint = { index: number; score: number; subjectName: string; date: string };

/** Score of each recent test, oldest → newest. */
export function ScoreTrendChart({ data }: { data: TrendPoint[] }) {
  const n = data.length;
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (score: number) => 100 - Math.max(0, Math.min(100, score));
  const last = data[n - 1];
  return (
    <figure>
      <div className="relative h-64">
        <Grid />
        <div
          role="img"
          aria-label={`Scores of your last ${n} tests${last ? `, latest ${last.score}%` : ""}`}
          className="absolute inset-y-0 left-8 right-0"
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            <polyline
              points={data.map((d, i) => `${x(i)},${y(d.score)}`).join(" ")}
              fill="none"
              stroke="var(--brand)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {data.map((d, i) => (
            <div
              key={`${d.index}-${i}`}
              className="group absolute size-6 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x(i)}%`, top: `${y(d.score)}%` }}
            >
              <span className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-brand transition-transform group-hover:scale-125" />
              <Tooltip align={x(i) < 15 ? "left" : x(i) > 85 ? "right" : "center"}>
                <span className="font-semibold">{d.score}%</span> <span className="text-muted-foreground">{d.subjectName}</span>
                <span className="block text-muted-foreground">{shortDate.format(new Date(d.date))}</span>
              </Tooltip>
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="ml-8 mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>Test {data[0]?.index ?? 1}</span>
        {n > 1 && <span>Test {last.index}</span>}
      </div>
      <TableView
        head={["Test", "Score"]}
        rows={[...data].reverse().map((d) => [`${d.subjectName} · ${shortDate.format(new Date(d.date))}`, `${d.score}%`])}
      />
    </figure>
  );
}

type SubjectPoint = { name: string; short: string; avgScore: number; color: string; tests: number };

/** Average score per subject (one series, so one colour; the subject is named under each column). */
export function SubjectBarChart({ data }: { data: SubjectPoint[] }) {
  return (
    <figure>
      <div className="relative h-64">
        <Grid />
        <div role="img" aria-label="Average score by subject" className="absolute inset-y-0 left-8 right-0 flex items-end gap-2">
          {data.map((d, i) => (
            <div key={d.name} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
              <div
                className="w-full max-w-6 rounded-t-[4px] bg-brand transition-colors group-hover:bg-brand-hover"
                style={{ height: `${d.avgScore}%`, minHeight: d.tests ? 3 : 0 }}
              />
              <Tooltip align={i === 0 ? "left" : i === data.length - 1 ? "right" : "center"}>
                <span className="font-semibold">{d.tests ? `${d.avgScore}%` : "No tests yet"}</span> <span className="text-muted-foreground">{d.name}</span>
                {d.tests > 0 && <span className="block text-muted-foreground">{d.tests} {d.tests === 1 ? "test" : "tests"}</span>}
              </Tooltip>
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="ml-8 mt-2 flex gap-2 text-[11px] text-muted-foreground">
        {data.map((d) => (
          <span key={d.name} className="min-w-0 flex-1 truncate text-center" title={d.name}>
            {d.short}
          </span>
        ))}
      </div>
      <TableView head={["Subject", "Average"]} rows={data.map((d) => [d.name, d.tests ? `${d.avgScore}% (${d.tests} tests)` : "No tests yet"])} />
    </figure>
  );
}
