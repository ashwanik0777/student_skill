import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const full = new Intl.NumberFormat("en-IN");
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** 1,284 under ten thousand, then 12.9K / 1.2M. */
export function formatCount(n: number) {
  return Math.abs(n) < 10_000 ? full.format(n) : compact.format(n);
}

export function StatTile({
  label,
  value,
  icon: Icon,
  delta,
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  /** e.g. { value: 12, label: "this week" } — positive growth is good here. */
  delta?: { value: number; label: string };
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight sm:mt-3 sm:text-3xl">{value}</p>
      {delta ? (
        <p className={cn("mt-1 flex items-center gap-1 text-[13px]", delta.value > 0 ? "text-success" : "text-muted-foreground")}>
          {delta.value > 0 && <ArrowUpRight className="size-3.5" aria-hidden />}
          {delta.value > 0 ? `+${formatCount(delta.value)}` : "No change"} {delta.label}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[13px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Rounds the axis top up to a clean number: 1, 2, 5, 10, 20, 50, … */
function niceTop(max: number) {
  if (max <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= max) return m * pow;
  return 10 * pow;
}

export type ColumnPoint = { key: string; label: string; value: number };

/**
 * Single-series column chart rendered on the server (no client JS). Each column's full-height slot is the hover
 * target; values are also listed in the table under the chart, so the tooltip never gates a number.
 */
export function ColumnChart({ data, unit, height = 168 }: { data: ColumnPoint[]; unit: [string, string]; height?: number }) {
  const max = Math.max(0, ...data.map((d) => d.value));
  const top = niceTop(max);
  const ticks = [0, top / 2, top];
  const total = data.reduce((s, d) => s + d.value, 0);
  const peak = data.reduce((best, d) => (d.value > best.value ? d : best), data[0]);
  const word = (n: number) => (n === 1 ? unit[0] : unit[1]);
  const xLabels = [data[0], data[Math.floor((data.length - 1) / 2)], data[data.length - 1]];

  return (
    <figure>
      <div className="relative" style={{ height }}>
        {ticks.map((t) => (
          <div key={t} aria-hidden className="absolute inset-x-0 border-t border-border" style={{ bottom: `${(t / top) * 100}%` }}>
            <span className="absolute -top-2 left-0 bg-surface pr-1.5 text-[11px] leading-none text-muted-foreground tabular">{formatCount(t)}</span>
          </div>
        ))}
        <div
          role="img"
          aria-label={`${formatCount(total)} ${word(total)} in ${data.length} days, peak ${formatCount(peak?.value ?? 0)} on ${peak?.label}`}
          className="absolute inset-y-0 left-9 right-0 flex items-end gap-[2px]"
        >
          {data.map((d, i) => (
            <div key={d.key} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
              <div
                className="w-full max-w-6 rounded-t-[4px] bg-brand transition-colors group-hover:bg-brand-hover"
                style={{ height: `${(d.value / top) * 100}%`, minHeight: d.value > 0 ? 3 : 0 }}
              />
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute bottom-full z-10 mb-1.5 hidden whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-pop group-hover:block",
                  i < 4 ? "left-0" : i > data.length - 5 ? "right-0" : "left-1/2 -translate-x-1/2",
                )}
              >
                <span className="font-semibold">{formatCount(d.value)}</span> <span className="text-muted-foreground">{word(d.value)}</span>
                <span className="block text-muted-foreground">{d.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="ml-9 mt-2 flex justify-between text-[11px] text-muted-foreground">
        {xLabels.map((d, i) => (
          <span key={`${d.key}-${i}`}>{d.label}</span>
        ))}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">Show as table</summary>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-border scrollbar-thin">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface-2 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Day</th>
                <th className="px-3 py-2 text-right font-medium">{unit[1][0].toUpperCase() + unit[1].slice(1)}</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.key} className="border-t border-border">
                  <td className="px-3 py-1.5">{d.label}</td>
                  <td className="px-3 py-1.5 text-right tabular">{formatCount(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** Horizontal bars with the value at each bar's tip. */
export function BarList({ items }: { items: { key: string; label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3.5">
      {items.map((item) => {
        const pct = (item.value / max) * 100;
        return (
          <li key={item.key} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-center gap-3 text-sm">
            <span className="truncate text-muted-foreground" title={item.label}>
              {item.label}
            </span>
            <span className="relative block h-2.5 pr-12">
              <span className="relative block h-full">
                <span className="absolute inset-y-0 left-0 rounded-r-[4px] bg-brand" style={{ width: `${Math.max(pct, 1.5)}%` }} />
                <span
                  className="absolute top-1/2 -translate-y-1/2 pl-2 text-xs font-medium tabular"
                  style={{ left: `${Math.max(pct, 1.5)}%` }}
                >
                  {formatCount(item.value)}
                </span>
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
