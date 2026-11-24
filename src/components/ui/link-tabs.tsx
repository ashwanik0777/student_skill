import Link from "next/link";
import { cn } from "@/lib/utils";

/** URL-driven tabs (server-friendly). */
export function LinkTabs({
  tabs,
  active,
  className,
}: {
  tabs: { href: string; label: React.ReactNode; value: string }[];
  active: string;
  className?: string;
}) {
  return (
    <nav className={cn("inline-flex rounded-xl border border-border bg-surface-2 p-1", className)} aria-label="Tabs">
      {tabs.map((t) => (
        <Link
          key={t.value}
          href={t.href}
          scroll={false}
          aria-current={active === t.value ? "page" : undefined}
          className={cn(
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
            active === t.value ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Pill-style filter chips driven by the URL. */
export function FilterChips({
  items,
  active,
}: {
  items: { href: string; label: React.ReactNode; value: string }[];
  active: string;
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((i) => (
        <Link
          key={i.value}
          href={i.href}
          scroll={false}
          aria-current={active === i.value ? "true" : undefined}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            active === i.value
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
          )}
        >
          {i.label}
        </Link>
      ))}
    </div>
  );
}
