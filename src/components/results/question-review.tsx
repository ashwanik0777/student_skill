"use client";

import { BotMessageSquare, Check, Clock, Lightbulb, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn, formatDuration } from "@/lib/utils";

export type ReviewQuestion = {
  id: string;
  position: number;
  chapter: string;
  topic: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  selectedIndex: number | null;
  isCorrect: boolean | null;
  timeSpentSec: number | null;
};

type Filter = "all" | "wrong" | "skipped" | "correct";
const LETTERS = ["A", "B", "C", "D", "E", "F"];

function status(q: ReviewQuestion): Exclude<Filter, "all"> {
  if (q.selectedIndex === null || q.selectedIndex === undefined) return "skipped";
  return q.isCorrect ? "correct" : "wrong";
}

export function QuestionReview({ questions }: { questions: ReviewQuestion[] }) {
  const counts = useMemo(() => {
    const c = { all: questions.length, wrong: 0, skipped: 0, correct: 0 };
    for (const q of questions) c[status(q)]++;
    return c;
  }, [questions]);
  const [filter, setFilter] = useState<Filter>(counts.wrong ? "wrong" : "all");
  const shown = questions.filter((q) => filter === "all" || status(q) === filter);

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Review answers</h2>
          <p className="text-sm text-muted-foreground">Every question with the correct answer and an explanation.</p>
        </div>
        <div className="inline-flex self-start rounded-xl border border-border bg-surface-2 p-1" role="tablist">
          {(["all", "wrong", "skipped", "correct"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                filter === f ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f} <span className="ml-0.5 text-xs text-muted-foreground tabular">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-strong py-10 text-center text-sm text-muted-foreground">
          Nothing here — {filter === "wrong" ? "no wrong answers. Superb!" : "no questions in this group."}
        </p>
      ) : (
        <ol className="space-y-4">
          {shown.map((q) => {
            const st = status(q);
            return (
              <li key={q.id} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-foreground tabular">Q{q.position + 1}</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                      st === "correct" && "bg-success-soft text-success",
                      st === "wrong" && "bg-danger-soft text-danger",
                      st === "skipped" && "bg-surface-2 text-muted-foreground",
                    )}
                  >
                    {st === "correct" ? <Check className="size-3" /> : st === "wrong" ? <X className="size-3" /> : null}
                    {st === "correct" ? "Correct" : st === "wrong" ? "Wrong" : "Skipped"}
                  </span>
                  <span className="truncate text-muted-foreground">
                    {q.chapter} · {q.topic}
                  </span>
                  {!!q.timeSpentSec && (
                    <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
                      <Clock className="size-3" /> {formatDuration(q.timeSpentSec)}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-[15px] font-medium leading-relaxed">{q.text}</p>
                <ul className="mt-4 grid gap-2">
                  {q.options.map((opt, i) => {
                    const isCorrect = i === q.correctIndex;
                    const isChosen = i === q.selectedIndex;
                    return (
                      <li
                        key={i}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-sm",
                          isCorrect
                            ? "border-success/40 bg-success-soft"
                            : isChosen
                              ? "border-danger/40 bg-danger-soft"
                              : "border-border",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-lg text-xs font-semibold",
                            isCorrect ? "bg-success text-white" : isChosen ? "bg-danger text-white" : "bg-surface-2 text-muted-foreground",
                          )}
                        >
                          {isCorrect ? <Check className="size-3.5" /> : isChosen ? <X className="size-3.5" /> : LETTERS[i]}
                        </span>
                        <span className="flex-1 pt-0.5 leading-relaxed">{opt}</span>
                        {isCorrect && <span className="shrink-0 pt-0.5 text-xs font-medium text-success">Correct answer</span>}
                        {isChosen && !isCorrect && <span className="shrink-0 pt-0.5 text-xs font-medium text-danger">Your answer</span>}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4 flex gap-3 rounded-xl bg-surface-2 p-4 text-sm">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" />
                  <p className="leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Explanation. </span>
                    {q.explanation}
                  </p>
                </div>
                {st !== "correct" && (
                  <Link
                    href={`/tutor?q=${encodeURIComponent(`Explain this question step by step:\n\n${q.text}\n\nOptions: ${q.options.map((o, i) => `${LETTERS[i]}) ${o}`).join("  ")}`)}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-ink hover:underline"
                  >
                    <BotMessageSquare className="size-4" /> Still unclear? Ask the AI tutor
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
