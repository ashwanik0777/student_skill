"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Clock,
  Eraser,
  Grid3x3,
  Maximize,
  Send,
  ShieldAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { SubjectChip } from "@/components/subject-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { loadLocalExam, saveLocalExam } from "@/lib/offline/store";
import type { EndReason, PublicQuestion } from "@/lib/types";
import { cn, formatClock } from "@/lib/utils";

export type AnswerPayload = { questionId: string; selectedIndex: number | null; timeSpentSec: number };
export type FinishPayload = { answers: AnswerPayload[]; reason: Exclude<EndReason, "offline">; hidden: boolean };

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function ExamRunner({
  title,
  strict,
  durationSec,
  questions,
  startedAtMs,
  clockOffsetMs,
  storageKey,
  onFinish,
}: {
  title: string;
  strict: boolean;
  durationSec: number;
  questions: PublicQuestion[];
  startedAtMs: number;
  clockOffsetMs: number;
  storageKey: string;
  onFinish: (payload: FinishPayload) => void;
}) {
  const initial = useMemo(() => loadLocalExam(storageKey), [storageKey]);
  const [current, setCurrent] = useState(() => Math.min(initial?.current ?? 0, questions.length - 1));
  const [answers, setAnswers] = useState<Record<string, number | null>>(() => initial?.answers ?? {});
  const [marked, setMarked] = useState<Set<string>>(() => new Set(initial?.marked ?? []));
  const [visited, setVisited] = useState<Set<string>>(() => new Set([...(initial?.visited ?? []), questions[0]?.id]));
  const [now, setNow] = useState(() => Date.now());
  const [warning, setWarning] = useState<null | "blur" | "fullscreen">(null);
  const [fsCountdown, setFsCountdown] = useState(10);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [finished, setFinished] = useState(false);

  const answersRef = useRef(answers);
  const currentRef = useRef(current);
  const timeSpentRef = useRef<Record<string, number>>(initial?.timeSpent ?? {});
  const lastTickRef = useRef(0);
  const finishedRef = useRef(false);
  const blurCountRef = useRef(0);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const flushTime = useCallback(() => {
    const t = performance.now();
    const q = questions[currentRef.current];
    if (q && lastTickRef.current) {
      timeSpentRef.current[q.id] = (timeSpentRef.current[q.id] ?? 0) + (t - lastTickRef.current) / 1000;
    }
    lastTickRef.current = t;
  }, [questions]);

  useEffect(() => {
    lastTickRef.current = performance.now();
  }, []);

  const finish = useCallback(
    (reason: FinishPayload["reason"], hidden = false) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      flushTime();
      setFinished(true);
      setWarning(null);
      setConfirmOpen(false);
      onFinish({
        reason,
        hidden,
        answers: questions.map((q) => ({
          questionId: q.id,
          selectedIndex: answersRef.current[q.id] ?? null,
          timeSpentSec: Math.round(timeSpentRef.current[q.id] ?? 0),
        })),
      });
    },
    [flushTime, onFinish, questions],
  );

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= questions.length) return;
      flushTime();
      currentRef.current = index;
      setCurrent(index);
      setVisited((v) => new Set(v).add(questions[index].id));
      setPaletteOpen(false);
    },
    [flushTime, questions],
  );

  const choose = useCallback(
    (index: number) => {
      const q = questions[currentRef.current];
      if (!q || index >= q.options.length || finishedRef.current) return;
      setAnswers((a) => ({ ...a, [q.id]: index }));
    },
    [questions],
  );

  const toggleMark = useCallback(() => {
    const q = questions[currentRef.current];
    setMarked((m) => {
      const next = new Set(m);
      if (next.has(q.id)) next.delete(q.id);
      else next.add(q.id);
      return next;
    });
  }, [questions]);

  // Persist progress locally so a reload never loses answers.
  useEffect(() => {
    saveLocalExam(storageKey, {
      answers,
      marked: [...marked],
      visited: [...visited],
      timeSpent: timeSpentRef.current,
      current,
    });
  }, [answers, marked, visited, current, storageKey]);

  // Clock
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const remaining = durationSec > 0 ? Math.ceil((startedAtMs + durationSec * 1000 - (now + clockOffsetMs)) / 1000) : null;
  const elapsed = Math.max(0, Math.floor((now + clockOffsetMs - startedAtMs) / 1000));
  useEffect(() => {
    if (remaining !== null && remaining <= 0) finish("time_up");
  }, [remaining, finish]);

  // Strict exam mode: leaving the window ends the test.
  useEffect(() => {
    if (!strict) return;
    const fsSupported = typeof document !== "undefined" && document.fullscreenEnabled;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") finish("tab_switch", true);
    };
    const onPageHide = () => finish("tab_switch", true);
    const onBlur = () => {
      window.setTimeout(() => {
        if (finishedRef.current || document.visibilityState === "hidden" || document.hasFocus()) return;
        blurCountRef.current += 1;
        if (blurCountRef.current >= 2) finish("tab_switch");
        else setWarning("blur");
      }, 200);
    };
    const onFullscreen = () => {
      if (!fsSupported || finishedRef.current) return;
      if (!document.fullscreenElement) {
        setFsCountdown(10);
        setWarning("fullscreen");
      } else {
        setWarning((w) => (w === "fullscreen" ? null : w));
      }
    };
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("contextmenu", block);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("contextmenu", block);
    };
  }, [strict, finish]);

  // Full-screen exit countdown
  useEffect(() => {
    if (warning !== "fullscreen") return;
    const id = setInterval(() => {
      setFsCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          finish("tab_switch");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [warning, finish]);

  // Ask before closing / reloading
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (finishedRef.current) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmOpen || warning || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (["1", "2", "3", "4"].includes(k)) choose(Number(k) - 1);
      else if (["a", "b", "c", "d"].includes(k)) choose(k.charCodeAt(0) - 97);
      else if (k === "arrowright" || k === "n") goTo(currentRef.current + 1);
      else if (k === "arrowleft" || k === "p") goTo(currentRef.current - 1);
      else if (k === "m") toggleMark();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, goTo, toggleMark, confirmOpen, warning]);

  const q = questions[current];
  const answeredCount = questions.filter((x) => answers[x.id] !== undefined && answers[x.id] !== null).length;
  const unanswered = questions.length - answeredCount;
  const lowTime = remaining !== null && remaining <= 120;
  const criticalTime = remaining !== null && remaining <= 30;

  const palette = (
    <QuestionPalette
      questions={questions}
      current={current}
      answers={answers}
      marked={marked}
      visited={visited}
      onSelect={goTo}
      answeredCount={answeredCount}
    />
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background select-none">
      {/* Top bar */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-3 sm:px-5">
        <LogoMark className="hidden size-8 sm:block" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold sm:text-base">{title}</p>
          <p className="hidden text-xs text-muted-foreground sm:block">
            {strict ? "Exam mode · leaving this window submits your test" : "Practice mode · take your time"}
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-1.5 font-mono text-[15px] font-semibold tabular transition-colors",
            criticalTime
              ? "animate-pulse border-danger/40 bg-danger-soft text-danger"
              : lowTime
                ? "border-warning/40 bg-warning-soft text-warning"
                : "border-border bg-background",
          )}
          role="timer"
          aria-label={remaining !== null ? "Time remaining" : "Time elapsed"}
        >
          <Clock className="size-4" />
          <span suppressHydrationWarning>{remaining !== null ? formatClock(remaining) : formatClock(elapsed)}</span>
        </div>
        <Button onClick={() => setConfirmOpen(true)} disabled={finished} className="hidden sm:inline-flex">
          <Send /> Submit
        </Button>
      </header>

      {/* Progress */}
      <div className="flex h-1.5 shrink-0 gap-0.5 bg-surface">
        {questions.map((x, i) => (
          <span
            key={x.id}
            className={cn(
              "flex-1 transition-colors",
              i === current ? "bg-brand" : answers[x.id] !== undefined && answers[x.id] !== null ? "bg-brand/45" : "bg-surface-3",
            )}
          />
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Question */}
        <main className="min-w-0 flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground tabular">
                  Question {current + 1} <span className="font-normal">of {questions.length}</span>
                </span>
                <SubjectChip subject={q.subject} />
                <span className="hidden max-w-[260px] truncate text-xs text-muted-foreground sm:inline" title={q.chapter}>
                  {q.chapter}
                </span>
              </div>
              <button
                type="button"
                onClick={toggleMark}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                  marked.has(q.id) ? "bg-warning-soft text-warning" : "text-muted-foreground hover:bg-surface-2",
                )}
                aria-pressed={marked.has(q.id)}
              >
                {marked.has(q.id) ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                {marked.has(q.id) ? "Marked for review" : "Mark for review"}
              </button>
            </div>

            <h2 key={q.id} className="mt-5 font-sans text-lg font-medium leading-relaxed tracking-normal text-pretty animate-fade-in sm:text-xl">
              {q.text}
            </h2>

            <div className="mt-7 grid gap-3" role="radiogroup" aria-label="Options">
              {q.options.map((opt, i) => {
                const selected = answers[q.id] === i;
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => choose(i)}
                    className={cn(
                      "group flex w-full items-start gap-4 rounded-2xl border bg-surface px-4 py-3.5 text-left transition-all duration-150 active:scale-[0.995]",
                      selected
                        ? "border-brand bg-brand-soft shadow-[0_0_0_3px_var(--brand-soft-border)]"
                        : "border-border hover:border-border-strong hover:bg-surface-2",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-xl text-sm font-semibold transition-colors",
                        selected ? "bg-brand text-white" : "bg-surface-2 text-muted-foreground group-hover:bg-surface-3",
                      )}
                    >
                      {LETTERS[i]}
                    </span>
                    <span className="pt-1 text-[15px] leading-relaxed">{opt}</span>
                  </button>
                );
              })}
            </div>

            <p className="mt-6 hidden text-xs text-muted-foreground sm:block">
              Shortcuts: <Kbd>1</Kbd>–<Kbd>4</Kbd> choose · <Kbd>←</Kbd> <Kbd>→</Kbd> move · <Kbd>M</Kbd> mark
            </p>
          </div>
        </main>

        {/* Palette (desktop) */}
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-surface p-5 scrollbar-thin lg:block">{palette}</aside>
      </div>

      {/* Bottom bar */}
      <footer className="flex shrink-0 items-center gap-2 border-t border-border bg-surface px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
        <Button variant="outline" onClick={() => goTo(current - 1)} disabled={current === 0}>
          <ArrowLeft /> <span className="hidden sm:inline">Previous</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => setAnswers((a) => ({ ...a, [q.id]: null }))}
          disabled={answers[q.id] === undefined || answers[q.id] === null}
          className="hidden sm:inline-flex"
        >
          <Eraser /> Clear
        </Button>
        <Button variant="outline" onClick={() => setPaletteOpen(true)} className="lg:hidden" aria-label="All questions">
          <Grid3x3 /> <span className="tabular">{answeredCount}/{questions.length}</span>
        </Button>
        <div className="flex-1" />
        {current < questions.length - 1 ? (
          <Button onClick={() => goTo(current + 1)}>
            Next <ArrowRight />
          </Button>
        ) : (
          <Button onClick={() => setConfirmOpen(true)} disabled={finished}>
            <Send /> Submit test
          </Button>
        )}
        <Button variant="soft" onClick={() => setConfirmOpen(true)} disabled={finished} className="sm:hidden" aria-label="Submit">
          <Send />
        </Button>
      </footer>

      {/* Mobile palette */}
      <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>All questions</DialogTitle>
          <div className="mt-4">{palette}</div>
        </DialogContent>
      </Dialog>

      {/* Submit confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogTitle>Submit your test?</DialogTitle>
          <DialogDescription>
            {unanswered > 0
              ? `You still have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}. Unanswered questions are marked as skipped.`
              : "You’ve answered every question. Nice!"}
          </DialogDescription>
          <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              ["Answered", answeredCount, "text-brand-ink"],
              ["Skipped", unanswered, "text-muted-foreground"],
              ["Marked", marked.size, "text-warning"],
            ].map(([label, value, color]) => (
              <div key={label as string} className="rounded-xl bg-surface-2 py-3">
                <dd className={cn("font-display text-2xl font-bold tabular", color as string)}>{value}</dd>
                <dt className="text-xs text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep going
            </Button>
            <Button onClick={() => finish("submitted")}>
              <Send /> Submit now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exam-mode warnings */}
      <Dialog open={warning !== null} onOpenChange={() => {}}>
        <DialogContent hideClose onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
          {warning === "fullscreen" ? (
            <>
              <span className="grid size-12 place-items-center rounded-2xl bg-warning-soft text-warning">
                <Maximize className="size-6" />
              </span>
              <DialogTitle className="mt-4">You left full-screen mode</DialogTitle>
              <DialogDescription>
                Return to full screen to continue. Your test will be submitted automatically in{" "}
                <span className="font-semibold text-foreground tabular">{fsCountdown}s</span>.
              </DialogDescription>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => finish("tab_switch")}>
                  Submit test
                </Button>
                <Button onClick={() => document.documentElement.requestFullscreen?.().catch(() => setWarning(null))}>
                  <Maximize /> Return to full screen
                </Button>
              </div>
            </>
          ) : (
            <>
              <span className="grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger">
                <ShieldAlert className="size-6" />
              </span>
              <DialogTitle className="mt-4">Stay on the test window</DialogTitle>
              <DialogDescription>
                We noticed you switched away. This is your only warning — next time the test will be submitted automatically.
              </DialogDescription>
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setWarning(null)}>I understand</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {finished && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4 shadow-pop">
            <span className="size-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <p className="text-sm font-medium">Submitting your answers…</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-grid min-w-5 place-items-center rounded-md border border-border bg-surface px-1 py-px font-mono text-[11px] text-foreground">
      {children}
    </kbd>
  );
}

function QuestionPalette({
  questions,
  current,
  answers,
  marked,
  visited,
  onSelect,
  answeredCount,
}: {
  questions: PublicQuestion[];
  current: number;
  answers: Record<string, number | null>;
  marked: Set<string>;
  visited: Set<string>;
  onSelect: (i: number) => void;
  answeredCount: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Questions</p>
        <p className="text-xs text-muted-foreground tabular">
          {answeredCount}/{questions.length} answered
        </p>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {questions.map((x, i) => {
          const answered = answers[x.id] !== undefined && answers[x.id] !== null;
          const isMarked = marked.has(x.id);
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`Question ${i + 1}${answered ? ", answered" : ""}${isMarked ? ", marked" : ""}`}
              aria-current={i === current ? "step" : undefined}
              className={cn(
                "relative grid aspect-square place-items-center rounded-xl border text-sm font-semibold tabular transition-colors",
                answered
                  ? "border-brand bg-brand text-white"
                  : visited.has(x.id)
                    ? "border-border-strong bg-surface text-foreground"
                    : "border-border bg-surface-2 text-muted-foreground",
                isMarked && !answered && "border-warning bg-warning-soft text-warning",
                i === current && "ring-2 ring-brand ring-offset-2 ring-offset-surface",
              )}
            >
              {i + 1}
              {isMarked && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-surface bg-warning" />}
            </button>
          );
        })}
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="size-3 rounded bg-brand" /> Answered
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded border border-warning bg-warning-soft" /> Marked
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded border border-border-strong bg-surface" /> Seen
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded border border-border bg-surface-2" /> Not visited
        </li>
      </ul>
    </div>
  );
}
