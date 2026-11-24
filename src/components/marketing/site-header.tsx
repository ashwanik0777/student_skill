"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { containerClass } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/#courses", label: "Courses" },
  { href: "/#faq", label: "FAQ" },
];

/**
 * `account` and `menuAccount` are server-rendered slots (see header-account.tsx), so the signed-in state arrives
 * with the page instead of a client-side session request.
 */
export function SiteHeader({ account, menuAccount }: { account: React.ReactNode; menuAccount: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className={cn(containerClass, "flex h-16 items-center gap-6")}>
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <div className="flex items-center gap-2">{account}</div>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-xl hover:bg-surface-2 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className={cn(containerClass, "border-t border-border bg-background pb-5 pt-2 lg:hidden animate-fade-in")}>
          <nav className="flex flex-col" aria-label="Mobile">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-[15px] font-medium text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 sm:hidden">{menuAccount}</div>
        </div>
      )}
    </header>
  );
}
