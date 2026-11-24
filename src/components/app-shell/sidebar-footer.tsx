import { Flame, Zap } from "lucide-react";
import Link from "next/link";
import { ThemeSwitch } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { UserMenu, type ShellUser } from "./user-menu";

const compactNumber = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

/**
 * Desktop sidebar footer: one quiet card. The top line holds the student's streak and XP (or a "Theme" label for
 * staff) with the light / dark / system switch; below it sits the raised account row that opens the account menu.
 */
export function SidebarFooter({ user, area = "student", stats }: { user: ShellUser; area?: "student" | "admin"; stats?: { streak: number; xp: number } }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/60 p-1.5">
      <div className="flex h-9 items-center gap-2 pl-2 pr-0.5">
        {stats ? (
          <Link
            href="/achievements"
            title={`${stats.streak}-day streak · ${stats.xp.toLocaleString("en-IN")} XP`}
            className="flex min-w-0 items-center gap-3 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="inline-flex items-center gap-1">
              <Flame className={cn("size-3.5", stats.streak > 0 && "text-orange-500")} />
              <span className="tabular font-semibold text-foreground">{stats.streak}</span>
              {stats.streak === 1 ? "day" : "days"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Zap className="size-3.5 text-brand-ink" />
              <span className="tabular font-semibold text-foreground">{compactNumber.format(stats.xp)}</span>
              XP
            </span>
          </Link>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">Theme</span>
        )}
        <ThemeSwitch className="ml-auto" />
      </div>
      <UserMenu user={user} area={area} variant="sidebar" />
    </div>
  );
}

/** Same footprint as the footer while it streams in. */
export function SidebarFooterSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/60 p-1.5" aria-hidden>
      <div className="flex h-9 items-center justify-between pl-2 pr-0.5">
        <span className="h-3 w-24 animate-pulse rounded bg-surface-3" />
        <span className="h-7 w-[82px] animate-pulse rounded-lg bg-surface-3" />
      </div>
      <div className="h-[54px] animate-pulse rounded-xl border border-border bg-surface" />
    </div>
  );
}
