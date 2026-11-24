"use client";

import { CloudOff, LoaderCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { beginAttemptAction } from "@/lib/actions/tests";
import { addToOutbox, clearLocalExam, loadLocalExam } from "@/lib/offline/store";
import type { PublicQuestion } from "@/lib/types";
import { ExamLobby } from "./exam-lobby";
import { ExamRunner, type FinishPayload } from "./exam-runner";

type TestInfo = {
  id: string;
  title: string;
  kind: string;
  subject: string;
  durationSec: number;
  strict: boolean;
};

type Phase = "lobby" | "running" | "interrupted" | "submitting" | "offline-saved" | "error";

function exitFullscreen() {
  if (typeof document !== "undefined" && document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

export function ExamClient({
  test,
  questions,
  attempt,
  serverNow,
}: {
  test: TestInfo;
  questions: PublicQuestion[];
  attempt: { id: string; startedAt: string } | null;
  serverNow: number;
}) {
  const router = useRouter();
  const [clockOffset] = useState(() => serverNow - Date.now());
  const [phase, setPhase] = useState<Phase>(attempt ? (test.strict ? "interrupted" : "running") : "lobby");
  const [session, setSession] = useState(attempt ? { attemptId: attempt.id, startedAtMs: Date.parse(attempt.startedAt) } : null);
  const [starting, setStarting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [interruptState, setInterruptState] = useState<"sending" | "done" | "failed">("sending");
  const submittedRef = useRef(false);

  const subjects = [...new Set(questions.map((q) => q.subject))];

  const goToResult = useCallback(
    (attemptId: string) => {
      clearLocalExam(attemptId);
      exitFullscreen();
      router.replace(`/results/${attemptId}`);
      router.refresh();
    },
    [router],
  );

  const send = useCallback(
    async (attemptId: string, body: string) => {
      try {
        const res = await fetch(`/api/attempts/${attemptId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
        if (res.ok) return "ok" as const;
        return res.status >= 500 ? ("retry" as const) : ("error" as const);
      } catch {
        return "retry" as const;
      }
    },
    [],
  );

  const handleFinish = useCallback(
    async ({ answers, reason, hidden }: FinishPayload) => {
      if (!session || submittedRef.current) return;
      submittedRef.current = true;
      const { attemptId } = session;
      const body = JSON.stringify({ answers, endReason: reason });

      if (hidden) {
        // The tab is going away: beacon now, confirm with a normal request when the student returns.
        const queued = navigator.sendBeacon?.(`/api/attempts/${attemptId}/submit`, new Blob([body], { type: "text/plain" }));
        if (!queued) await addToOutbox({ id: attemptId, type: "submit", attemptId, title: test.title, payload: { answers, endReason: reason }, createdAt: new Date().toISOString() });
        setPhase("submitting");
        const onVisible = async () => {
          if (document.visibilityState !== "visible") return;
          document.removeEventListener("visibilitychange", onVisible);
          const r = await send(attemptId, body);
          if (r === "ok") goToResult(attemptId);
          else setPhase("offline-saved");
        };
        document.addEventListener("visibilitychange", onVisible);
        return;
      }

      setPhase("submitting");
      const r = await send(attemptId, body);
      if (r === "ok") return goToResult(attemptId);
      if (r === "retry") {
        await addToOutbox({ id: attemptId, type: "submit", attemptId, title: test.title, payload: { answers, endReason: reason }, createdAt: new Date().toISOString() });
        exitFullscreen();
        setPhase("offline-saved");
        return;
      }
      exitFullscreen();
      setErrorText("We couldn't submit this test. It may have already been submitted.");
      setPhase("error");
    },
    [session, send, goToResult, test.title],
  );

  // A strict test that was left mid-way is finished with whatever was saved locally.
  useEffect(() => {
    if (phase !== "interrupted" || !session || submittedRef.current) return;
    submittedRef.current = true;
    const local = loadLocalExam(session.attemptId);
    const answers = questions.map((q) => ({
      questionId: q.id,
      selectedIndex: local?.answers[q.id] ?? null,
      timeSpentSec: Math.round(local?.timeSpent[q.id] ?? 0),
    }));
    send(session.attemptId, JSON.stringify({ answers, endReason: "tab_switch" })).then(async (r) => {
      if (r === "ok") {
        clearLocalExam(session.attemptId);
        setInterruptState("done");
        return;
      }
      if (r === "retry") {
        await addToOutbox({
          id: session.attemptId,
          type: "submit",
          attemptId: session.attemptId,
          title: test.title,
          payload: { answers, endReason: "tab_switch" },
          createdAt: new Date().toISOString(),
        });
      }
      setErrorText(
        r === "retry"
          ? "We couldn't reach the server. Your answers are saved and will sync when you're back online."
          : "This test couldn't be submitted. It may already have been graded.",
      );
      setInterruptState("failed");
    });
  }, [phase, session, questions, send, test.title]);

  async function start() {
    if (test.strict && document.fullscreenEnabled) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    setStarting(true);
    const r = await beginAttemptAction(test.id);
    if (!r.ok) {
      exitFullscreen();
      setStarting(false);
      toast.error(r.error);
      router.refresh();
      return;
    }
    setSession({ attemptId: r.data.attemptId, startedAtMs: Date.parse(r.data.startedAt) });
    setPhase("running");
  }

  if (phase === "lobby") {
    return (
      <ExamLobby
        title={test.title}
        subject={test.subject}
        subjects={subjects}
        questionCount={questions.length}
        durationSec={test.durationSec}
        strict={test.strict}
        starting={starting}
        onStart={start}
        backHref={test.kind === "practice" ? "/practice" : "/dashboard"}
        footnote={test.strict ? "Tip: close other apps and silence notifications before you start." : undefined}
      />
    );
  }

  if ((phase === "running" || phase === "submitting") && session) {
    return (
      <>
        <ExamRunner
          title={test.title}
          strict={test.strict}
          durationSec={test.durationSec}
          questions={questions}
          startedAtMs={session.startedAtMs}
          clockOffsetMs={clockOffset}
          storageKey={session.attemptId}
          onFinish={handleFinish}
        />
      </>
    );
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 text-center shadow-lift animate-pop">
        {phase === "interrupted" ? (
          <>
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-warning-soft text-warning">
              <ShieldAlert className="size-7" />
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-tight">This test has ended</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You left the exam window, so your test was submitted with the answers you’d already marked.
            </p>
            {interruptState === "failed" ? (
              <>
                <p className="mt-4 text-sm text-danger">{errorText}</p>
                <Button asChild className="mt-6 w-full" size="lg" variant="outline">
                  <Link href="/tests">Go to tests</Link>
                </Button>
              </>
            ) : (
              <Button
                className="mt-7 w-full"
                size="lg"
                loading={interruptState === "sending"}
                onClick={() => session && goToResult(session.attemptId)}
              >
                {interruptState === "sending" ? "Submitting…" : "See your result"}
              </Button>
            )}
          </>
        ) : phase === "offline-saved" ? (
          <>
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
              <CloudOff className="size-7" />
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-tight">Saved — you’re offline</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your answers are stored safely on this device and will be submitted automatically when you’re back online.
            </p>
            <Button asChild className="mt-7 w-full" size="lg" variant="outline">
              <Link href="/offline">Open offline centre</Link>
            </Button>
          </>
        ) : phase === "error" ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">{errorText}</p>
            <Button asChild className="mt-7 w-full" size="lg">
              <Link href="/tests">Go to tests</Link>
            </Button>
          </>
        ) : (
          <LoaderCircle className="mx-auto size-8 animate-spin text-brand-ink" />
        )}
      </div>
    </div>
  );
}
