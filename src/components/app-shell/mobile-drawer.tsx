"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Dialog, DialogClose, DialogTitle, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { SidebarNav } from "./sidebar-nav";

export function MobileDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="grid size-9 place-items-center rounded-xl hover:bg-surface-2" aria-label="Open menu">
        <Menu className="size-5" />
      </DialogTrigger>
      <SheetContent aria-describedby={undefined}>
        <DialogTitle className="sr-only">Navigation</DialogTitle>
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Logo href="/dashboard" />
          <DialogClose className="grid size-9 place-items-center rounded-xl hover:bg-surface-2" aria-label="Close menu">
            <X className="size-5" />
          </DialogClose>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Dialog>
  );
}
