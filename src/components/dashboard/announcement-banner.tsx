"use client";

import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DISMISS_COOKIE } from "./announcement-cookie";

const TONE = {
  info: { icon: Info, box: "border-brand-soft-border bg-brand-soft", icon_: "text-brand-ink" },
  success: { icon: CircleCheck, box: "border-transparent bg-success-soft", icon_: "text-success" },
  warning: { icon: TriangleAlert, box: "border-transparent bg-warning-soft", icon_: "text-warning" },
} as const;

/** Remembers dismissals in a cookie so the server can leave them out — no flash or layout shift on reload. */
function rememberDismissed(id: string) {
  const current = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${DISMISS_COOKIE}=`))
    ?.split("=")[1];
  const ids = decodeURIComponent(current ?? "")
    .split(",")
    .filter(Boolean);
  const next = [...ids.filter((x) => x !== id), id].slice(-30);
  document.cookie = `${DISMISS_COOKIE}=${encodeURIComponent(next.join(","))}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
}

export function AnnouncementBanner({ id, title, body, tone }: { id: string; title: string; body: string; tone: keyof typeof TONE }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const t = TONE[tone];
  return (
    <div role="status" className={cn("flex items-start gap-3 rounded-2xl border p-4", t.box)}>
      <t.icon className={cn("mt-0.5 size-5 shrink-0", t.icon_)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground/80">{body}</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => {
          rememberDismissed(id);
          setHidden(true);
        }}
        className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface/60 hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
