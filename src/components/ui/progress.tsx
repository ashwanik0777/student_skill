import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  className,
  barClassName,
  label,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className={cn("h-full rounded-full bg-brand transition-[width] duration-700 ease-out", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Circular progress ring (SVG, solid stroke). */
export function Ring({
  value,
  size = 120,
  stroke = 10,
  className,
  trackClassName = "text-surface-3",
  barClassName = "text-brand",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="currentColor" className={trackClassName} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className={cn("transition-[stroke-dashoffset] duration-1000 ease-out", barClassName)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
