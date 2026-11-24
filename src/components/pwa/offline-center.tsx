"use client";

import { ArrowLeft, CheckCircle2, CloudUpload, Download, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { ExamLobby } from "@/components/exam/exam-lobby";
import { ExamRunner, type FinishPayload } from "@/components/exam/exam-runner";
import { Logo } from "@/components/brand/logo";
import { SubjectIcon } from "@/components/subject-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  addToOutbox,
  clearLocalExam,
  flushOutbox,
  getOutbox,
  listPackages,
  removePackage,
  type OfflinePackage,
  type OutboxEntry,
} from "@/lib/offline/store";
import { cn, formatDuration, timeAgo } from "@/lib/utils";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

type Mode = { kind: "list" } | { kind: "lobby"; pkg: OfflinePackage } | { kind: "running"; pkg: OfflinePackage; startedAt: number } | { kind: "saved"; title: string };

export function OfflineCenter() {
  const online = useOnline();
  const [packages, setPackages] = useState<OfflinePackage[] | null>(null);
  const [outbox, setOutbox] = useState<OutboxEntry[]>([]);
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [syncing, setSyncing] = useState(false);

  const reload = useCallback(async () => {
    const [p, o] = await Promise.all([listPackages(), getOutbox()]);
    setPackages(p);
    setOutbox(o);
  }, []);

  useEffect(() => {
    // Loads IndexedDB state once on mount; setState happens after the async read resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const sync = useCallback(async () => {
    setSyncing(true);
    const { sent, remaining } = await flushOutbox();
    setSyncing(false);
    await reload();
    if (sent) toast.success(`Synced ${sent} test${sent > 1 ? "s" : ""}`, { description: "Results are on your Tests page." });
    else if (remaining) toast.message("Couldn’t sync yet", { description: "Make sure you’re online and signed in." });
  }, [reload]);

  const finishOffline = useCallback(
    async (pkg: OfflinePackage, startedAt: number, { answers }: FinishPayload) => {
      await addToOutbox({
        id: `offline-${pkg.id}`,
        type: "offline-attempt",
        testId: pkg.id,
        title: pkg.title,
        payload: {
          testId: pkg.id,
          startedAt: new Date(startedAt).toISOString(),
          completedAt: new Date().toISOString(),
          answers,
        },
        createdAt: new Date().toISOString(),
      });
      clearLocalExam(`offline:${pkg.id}`);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setMode({ kind: "saved", title: pkg.title });
      await reload();
      if (navigator.onLine) sync();
    },
    [reload, sync],
  );

  if (mode.kind === "lobby") {
    const pkg = mode.pkg;
    return (
      <ExamLobby
        title={pkg.title}
        subject={pkg.subject}
        subjects={[...new Set(pkg.questions.map((q) => q.subject))]}
        questionCount={pkg.questions.length}
        durationSec={pkg.durationSec}
        strict={pkg.kind !== "practice"}
        starting={false}
        backHref="/offline"
        footnote="Offline test — your answers sync automatically when you reconnect."
        onStart={() => {
          if (pkg.kind !== "practice" && document.fullscreenEnabled) document.documentElement.requestFullscreen().catch(() => {});
          setMode({ kind: "running", pkg, startedAt: Date.now() });
        }}
      />
    );
  }

  if (mode.kind === "running") {
    const { pkg, startedAt } = mode;
    return (
      <ExamRunner
        title={pkg.title}
        strict={pkg.kind !== "practice"}
        durationSec={pkg.durationSec}
        questions={pkg.questions}
        startedAtMs={startedAt}
        clockOffsetMs={0}
        storageKey={`offline:${pkg.id}`}
        onFinish={(p) => finishOffline(pkg, startedAt, p)}
      />
    );
  }

  const pendingIds = new Set(outbox.filter((o) => o.type === "offline-attempt").map((o) => (o.type === "offline-attempt" ? o.testId : "")));

  return (
    <div className="min-h-dvh">
      <header className="mx-auto w-full max-w-384 px-4 sm:px-6 lg:px-10 flex h-16 items-center gap-3">
        <Logo href={online ? "/dashboard" : "/offline"} />
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
            online ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
          )}
        >
          {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
          {online ? "Online" : "Offline"}
        </span>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-384 px-4 sm:px-6 lg:px-10 pb-16 pt-6">
        {online && (
          <Link href="/tests" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to tests
          </Link>
        )}
        <h1 className="text-3xl font-bold tracking-tight">Offline centre</h1>
        <p className="mt-2 text-muted-foreground">
          Tests you’ve downloaded live on this device. Take them anywhere — results sync when you’re back online.
        </p>

        {mode.kind === "saved" && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-success/25 bg-success-soft p-4 text-sm animate-pop">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
            <div>
              <p className="font-semibold">“{mode.title}” saved</p>
              <p className="text-muted-foreground">
                {online ? "Syncing your answers now…" : "Your answers will be submitted automatically when you reconnect."}
              </p>
            </div>
          </div>
        )}

        {outbox.length > 0 && (
          <section className="mt-8 rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-ink">
                  <CloudUpload className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">Waiting to sync</p>
                  <p className="text-sm text-muted-foreground">
                    {outbox.length} finished test{outbox.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={sync} loading={syncing} disabled={!online}>
                {!syncing && <RefreshCw />} Sync now
              </Button>
            </div>
            <ul className="mt-4 space-y-1.5 text-sm">
              {outbox.map((o) => (
                <li key={o.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
                  <span className="truncate">{o.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(o.createdAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Downloaded tests</h2>
          {packages === null ? (
            <div className="mt-4 h-28 animate-pulse rounded-2xl bg-surface-3/70" />
          ) : packages.length === 0 ? (
            <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
                <Download className="size-6" />
              </span>
              <p className="mt-4 font-semibold">No tests downloaded yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                While you’re online, open <span className="font-medium text-foreground">Tests</span> and tap{" "}
                <span className="font-medium text-foreground">Download</span> to save today’s tests here.
              </p>
              {online && (
                <Button asChild className="mt-5">
                  <Link href="/tests">Go to tests</Link>
                </Button>
              )}
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {packages.map((p) => {
                const done = pendingIds.has(p.id);
                return (
                  <li key={p.id} className="flex flex-col rounded-2xl border border-border bg-surface p-5">
                    <div className="flex items-start gap-3">
                      <SubjectIcon subject={p.subject} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{p.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.questions.length} questions · {p.durationSec ? formatDuration(p.durationSec) : "untimed"} · saved {timeAgo(p.downloadedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      {done ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
                          <CheckCircle2 className="size-4" /> Completed · waiting to sync
                        </span>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => setMode({ kind: "lobby", pkg: p })}>
                            Start
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground"
                            onClick={async () => {
                              await removePackage(p.id);
                              reload();
                            }}
                          >
                            <Trash2 /> Remove
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
