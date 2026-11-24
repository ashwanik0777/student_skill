"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, TAB_ITEMS, isActive } from "./nav-items";

function NavList({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-6" aria-label="App">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{section.title}</p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-soft text-brand-ink"
                        : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    <item.icon className={cn("size-[18px] shrink-0", active ? "text-brand-ink" : "text-muted-foreground group-hover:text-foreground")} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ActiveNavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <NavList pathname={pathname} onNavigate={onNavigate} />;
}

/** `usePathname` suspends on dynamic routes under Cache Components, so the active state streams in. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavList pathname={null} />}>
      <ActiveNavList onNavigate={onNavigate} />
    </Suspense>
  );
}

function Tabs({ pathname }: { pathname: string | null }) {
  return (
    <ul className="grid grid-cols-5">
      {TAB_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
                active ? "text-brand-ink" : "text-muted-foreground",
              )}
            >
              <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-brand-soft")}>
                <item.icon className="size-[18px]" />
              </span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ActiveTabs() {
  const pathname = usePathname();
  return <Tabs pathname={pathname} />;
}

export function MobileTabBar() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <Suspense fallback={<Tabs pathname={null} />}>
        <ActiveTabs />
      </Suspense>
    </nav>
  );
}
