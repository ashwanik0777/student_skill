"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateInsightsAction, generateStudyPlanAction } from "@/lib/actions/insights";
import { cn } from "@/lib/utils";

export function InsightsButton({ hasReport }: { hasReport: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant={hasReport ? "outline" : "primary"}
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await generateInsightsAction();
          if (!r.ok) toast.error(r.error);
          else toast.success("Insights updated");
        })
      }
    >
      {!pending && (hasReport ? <RefreshCw /> : <Sparkles />)}
      {pending ? "Analysing…" : hasReport ? "Refresh" : "Generate insights"}
    </Button>
  );
}

export function StudyPlanButton({ hasPlan }: { hasPlan: boolean }) {
  const [pending, start] = useTransition();
  const [hours, setHours] = useState(2);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl border border-border bg-surface-2 p-1" role="radiogroup" aria-label="Hours per day">
        {[1, 2, 3].map((h) => (
          <button
            key={h}
            type="button"
            role="radio"
            aria-checked={hours === h}
            onClick={() => setHours(h)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
              hours === h ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {h}h/day
          </button>
        ))}
      </div>
      <Button
        size="sm"
        variant={hasPlan ? "outline" : "primary"}
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await generateStudyPlanAction(hours);
            if (!r.ok) toast.error(r.error);
            else toast.success("Your study plan is ready");
          })
        }
      >
        {!pending && (hasPlan ? <RefreshCw /> : <Sparkles />)}
        {pending ? "Planning…" : hasPlan ? "New plan" : "Create my plan"}
      </Button>
    </div>
  );
}
