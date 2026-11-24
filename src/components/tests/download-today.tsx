"use client";

import { Check, Download, WifiOff } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { prepareTodayForOfflineAction } from "@/lib/actions/offline";
import { savePackage, type OfflinePackage } from "@/lib/offline/store";

export function DownloadToday({ pending }: { pending: number }) {
  const [busy, startTransition] = useTransition();
  const [done, setDone] = useState(0);

  function download() {
    startTransition(async () => {
      const r = await prepareTodayForOfflineAction();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      let saved = 0;
      for (const id of r.data.testIds) {
        const res = await fetch(`/api/offline/tests/${id}`);
        if (!res.ok) continue;
        await savePackage((await res.json()) as OfflinePackage);
        saved++;
      }
      setDone(saved);
      if (saved) toast.success(`${saved} test${saved > 1 ? "s" : ""} saved for offline use`);
      else toast.message("Nothing left to download — you’ve finished today’s tests.");
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
        <WifiOff className="size-5" />
      </span>
      <div className="flex-1">
        <p className="font-semibold">Going somewhere without internet?</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Download today’s {pending} remaining test{pending === 1 ? "" : "s"}, take them offline, and they’ll sync automatically later.
        </p>
      </div>
      <div className="flex gap-2">
        {done > 0 && (
          <Button asChild variant="outline">
            <Link href="/offline">Open offline centre</Link>
          </Button>
        )}
        <Button variant={done ? "soft" : "primary"} onClick={download} loading={busy} disabled={pending === 0}>
          {!busy && (done ? <Check /> : <Download />)}
          {busy ? "Preparing…" : done ? "Downloaded" : "Download"}
        </Button>
      </div>
    </div>
  );
}
