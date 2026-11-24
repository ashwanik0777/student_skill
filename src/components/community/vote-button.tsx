"use client";

import { ArrowBigUp } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { toggleVoteAction } from "@/lib/actions/forum";
import { cn } from "@/lib/utils";

export function VoteButton({
  targetType,
  targetId,
  count,
  voted,
  disabled,
  layout = "column",
}: {
  targetType: "post" | "reply";
  targetId: string;
  count: number;
  voted: boolean;
  disabled?: boolean;
  layout?: "column" | "row";
}) {
  const [state, setState] = useOptimistic({ count, voted });
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() =>
        startTransition(async () => {
          setState({ count: state.count + (state.voted ? -1 : 1), voted: !state.voted });
          const r = await toggleVoteAction(targetType, targetId);
          if (!r.ok) toast.error(r.error);
        })
      }
      aria-pressed={state.voted}
      aria-label={state.voted ? "Remove upvote" : "Upvote"}
      title={disabled ? "You can’t upvote your own post" : undefined}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-xl border text-sm font-semibold tabular transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        layout === "column" ? "w-12 shrink-0 flex-col self-start py-1.5" : "h-8 px-2.5",
        state.voted ? "border-brand/40 bg-brand-soft text-brand-ink" : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
      )}
    >
      <ArrowBigUp className={cn("size-5", state.voted && "fill-current")} />
      {state.count}
    </button>
  );
}
