"use client";

import { Check, Sparkles, Target } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { requestFeedbackAction } from "@/lib/actions/tests";
import type { AttemptFeedback } from "@/lib/db/schema";

export function AiFeedback({ attemptId, initial }: { attemptId: string; initial: AttemptFeedback | null }) {
  const [feedback, setFeedback] = useState(initial);
  const [pending, startTransition] = useTransition();

  if (!feedback) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-brand-soft-border bg-brand-soft p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-white">
          <Sparkles className="size-5" />
        </span>
        <div className="flex-1">
          <p className="font-semibold">Get coach feedback on this test</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            A short, personal breakdown of what went well, what to fix, and exactly how to fix it.
          </p>
        </div>
        <Button
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await requestFeedbackAction(attemptId);
              if (r.ok) setFeedback(r.data);
              else toast.error(r.error);
            })
          }
        >
          {pending ? "Analysing…" : "Analyse my test"}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 animate-fade-up">
      <div className="flex items-center gap-2 text-brand-ink">
        <Sparkles className="size-4" />
        <p className="text-sm font-semibold">Coach feedback</p>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed">{feedback.summary}</p>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Went well</p>
          <ul className="mt-3 space-y-2">
            {(feedback.strengths.length ? feedback.strengths : ["You completed the test — that’s the first step."]).map((s) => (
              <li key={s} className="flex gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Focus on</p>
          <ul className="mt-3 space-y-3">
            {feedback.focusAreas.length ? (
              feedback.focusAreas.map((f) => (
                <li key={f.topic} className="rounded-xl bg-surface-2 p-3.5 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <Target className="size-4 text-warning" /> {f.topic}
                  </p>
                  <p className="mt-1 text-muted-foreground">{f.why}</p>
                  <p className="mt-1.5">
                    <span className="font-medium">Tip: </span>
                    {f.tip}
                  </p>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">No weak spots this time. Try a harder practice test!</li>
            )}
          </ul>
        </div>
      </div>
      {feedback.nextSteps.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next steps</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-3">
            {feedback.nextSteps.map((s, i) => (
              <li key={s} className="flex gap-2.5 text-sm">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand-ink">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
