import { Check, Clock, Flame, Lightbulb, Sparkles, Zap } from "lucide-react";
import { DotPattern } from "@/components/ui/dot-pattern";

/** Static product preview for the hero — built from real UI pieces, no screenshots. */
export function HeroPreview() {
  const options = ["b² − 4ac > 0", "b² − 4ac = 0", "b² − 4ac < 0", "b² + 4ac = 0"];
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-[28px] border border-brand-soft-border bg-brand-soft p-5 sm:p-8">
        <DotPattern className="text-brand/15" />
        {/* Exam card */}
        <div className="relative rounded-2xl border border-border bg-surface p-5 shadow-lift">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                Mathematics
              </span>
              <span className="text-xs text-muted-foreground">Question 4 of 10</span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1 font-mono text-xs font-medium tabular">
              <Clock className="size-3.5 text-muted-foreground" /> 11:42
            </span>
          </div>
          <div className="mt-3 flex gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < 3 ? "bg-brand" : i === 3 ? "bg-brand/40" : "bg-surface-3"}`} />
            ))}
          </div>
          <p className="mt-5 text-[15px] font-medium leading-relaxed">
            For which condition does the quadratic equation ax² + bx + c = 0 have two distinct real roots?
          </p>
          <div className="mt-4 grid gap-2">
            {options.map((o, i) => (
              <div
                key={o}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm ${
                  i === 0 ? "border-brand bg-brand-soft font-medium" : "border-border"
                }`}
              >
                <span
                  className={`grid size-6 place-items-center rounded-lg text-xs font-semibold ${
                    i === 0 ? "bg-brand text-white" : "bg-surface-2 text-muted-foreground"
                  }`}
                >
                  {"ABCD"[i]}
                </span>
                <span className="font-mono text-[13px]">{o}</span>
                {i === 0 && <Check className="ml-auto size-4 text-brand-ink" />}
              </div>
            ))}
          </div>
        </div>

        {/* Insight card */}
        <div className="relative mt-4 flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-lift sm:ml-16">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
            <Lightbulb className="size-[18px]" />
          </span>
          <div className="text-sm">
            <p className="font-semibold">AI insight</p>
            <p className="mt-0.5 text-muted-foreground">
              You miss “nature of roots” questions under time pressure. Tomorrow’s Maths test adds 3 of them.
            </p>
          </div>
        </div>
      </div>

      {/* Floating chips */}
      <div className="absolute -left-4 -top-7 hidden items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 py-2.5 shadow-pop sm:flex animate-fade-up [animation-delay:200ms]">
        <span className="grid size-8 place-items-center rounded-xl bg-orange-500/12 text-orange-600 dark:text-orange-400">
          <Flame className="size-[18px]" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tabular">12-day streak</p>
          <p className="text-xs text-muted-foreground">Keep it going</p>
        </div>
      </div>
      <div className="absolute -right-3 top-[46%] hidden items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 py-2.5 shadow-pop sm:flex animate-fade-up [animation-delay:350ms]">
        <span className="grid size-8 place-items-center rounded-xl bg-brand-soft text-brand-ink">
          <Zap className="size-[18px]" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tabular">+120 XP</p>
          <p className="text-xs text-muted-foreground">Daily test complete</p>
        </div>
      </div>
      <div className="absolute -bottom-4 left-8 hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium shadow-pop sm:flex animate-fade-up [animation-delay:500ms]">
        <Sparkles className="size-3.5 text-brand-ink" /> Personalised for you
      </div>
    </div>
  );
}
