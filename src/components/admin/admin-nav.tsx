"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Dialog, DialogClose, DialogTitle, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, isAdminActive } from "./nav-items";

function NavList({ allowed, pathname, onNavigate }: { allowed: string[]; pathname: string | null; onNavigate?: () => void }) {
  const items = ADMIN_NAV.filter((item) => allowed.includes(item.href));
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <nav aria-label="Admin" className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{group}</p>
          <ul className="flex flex-col gap-0.5">
            {items
              .filter((i) => i.group === group)
              .map((item) => {
                const active = isAdminActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-brand-soft text-brand-ink" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-[18px] shrink-0",
                          active ? "text-brand-ink" : "text-muted-foreground group-hover:text-foreground",
                        )}
                      />
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

function ActiveNavList(props: { allowed: string[]; onNavigate?: () => void }) {
  return <NavList {...props} pathname={usePathname()} />;
}

/** `usePathname` suspends on dynamic admin routes (e.g. /admin/students/[id]), so the active state streams in. */
export function AdminNav({ allowed, onNavigate }: { allowed: string[]; onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavList allowed={allowed} pathname={null} />}>
      <ActiveNavList allowed={allowed} onNavigate={onNavigate} />
    </Suspense>
  );
}

export function AdminDrawer({ allowed }: { allowed: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="grid size-9 place-items-center rounded-xl hover:bg-surface-2" aria-label="Open admin menu">
        <Menu className="size-5" />
      </DialogTrigger>
      <SheetContent aria-describedby={undefined}>
        <DialogTitle className="sr-only">Admin navigation</DialogTitle>
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Logo href="/admin" />
          <DialogClose className="grid size-9 place-items-center rounded-xl hover:bg-surface-2" aria-label="Close menu">
            <X className="size-5" />
          </DialogClose>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin">
          <AdminNav allowed={allowed} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Dialog>
  );
}
