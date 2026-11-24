"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

/** Single icon button that cycles light → dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground",
        className,
      )}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/** Small icon-only light / dark / system switch (sidebar footer). */
export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  return (
    <div className={cn("inline-flex shrink-0 items-center rounded-lg border border-border bg-surface p-0.5", className)} role="radiogroup" aria-label="Theme">
      {options.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "grid size-6 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}

/** Segmented control for the profile/settings page. */
export function ThemeSegmented() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  return (
    <div className="flex w-full rounded-xl border border-border bg-surface-2 p-1 sm:inline-flex sm:w-auto" role="radiogroup" aria-label="Theme">
      {options.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none",
              active ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
