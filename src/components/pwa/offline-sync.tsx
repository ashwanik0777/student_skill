"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { flushOutbox } from "@/lib/offline/store";

/** Flushes tests that were finished offline as soon as the device is back online. */
export function OfflineSync() {
  useEffect(() => {
    let running = false;
    const run = async () => {
      if (running) return;
      running = true;
      try {
        const { sent } = await flushOutbox();
        if (sent > 0) toast.success(`Synced ${sent} offline test${sent > 1 ? "s" : ""}`, { description: "Your results and XP are updated." });
      } finally {
        running = false;
      }
    };
    run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, []);
  return null;
}
