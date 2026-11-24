"use client";

import { ArrowRight, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { confirmToast } from "@/components/ui/confirm";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { changeTrackAction, type TrackChangeMode } from "@/lib/actions/track";
import { useCatalogLabels } from "@/lib/catalog/context";
import { sameTrack, type Track } from "@/lib/catalog/shared";
import { TrackPicker, draftFromTrack, type TrackDraft, type TrackLimits } from "./track-picker";

export function CourseChanger({
  mode,
  current,
  limits,
  startFromCurrent,
  label,
  title,
  description,
  variant = "primary",
}: {
  mode: TrackChangeMode;
  current: Track;
  limits?: TrackLimits;
  /** Pre-select the current course (corrections) instead of starting blank. */
  startFromCurrent?: boolean;
  label: string;
  title: string;
  description: string;
  variant?: ButtonProps["variant"];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState<Track | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [pending, startTransition] = useTransition();
  const onChange = useCallback((t: Track | null) => setNext(t), []);
  const { trackLabel } = useCatalogLabels();

  const initial: TrackDraft | undefined = startFromCurrent
    ? draftFromTrack(current)
    : current.kind === "school" && limits?.kind === "school"
      ? { kind: "school", board: current.board, grade: null, stream: current.stream, exam: null }
      : undefined;

  const permanent = mode === "promote";
  const unchanged = !next || sameTrack(next, current);

  function submit() {
    if (!next) return;
    startTransition(async () => {
      const ok = await confirmToast({
        title: mode === "promote" ? `Move up to ${trackLabel(next)}?` : `Switch to ${trackLabel(next)}?`,
        description: permanent ? "This can’t be undone." : "Your XP, streak and badges come with you.",
        confirmLabel: mode === "promote" ? "Move up" : "Switch",
        tone: permanent ? "danger" : "primary",
      });
      if (!ok) return;
      const draft = draftFromTrack(next);
      const r = await changeTrackAction({ mode, ...draft, kind: draft.kind ?? "" });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(mode === "promote" ? `Welcome to ${r.label}!` : `Course updated to ${r.label}`, {
        description: "Your XP, streak and badges came with you.",
      });
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setAgreed(false);
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant}>
          {label} <ArrowRight />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>

        <div className="mt-6">
          <TrackPicker key={String(open)} initial={initial} limits={limits} onChange={onChange} />
        </div>

        {next && !unchanged && (
          <div className="mt-6 rounded-2xl border border-border bg-surface-2 p-4 text-sm">
            <p className="text-muted-foreground">
              {trackLabel(current)} <ArrowRight className="mx-1 inline size-3.5" />{" "}
              <span className="font-semibold text-foreground">{trackLabel(next)}</span>
            </p>
          </div>
        )}

        {permanent && (
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 accent-brand" />
            <span>
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="size-4 text-warning" /> This can’t be undone
              </span>
              <span className="mt-0.5 block text-muted-foreground">
                You can move up only once a year and never back to an earlier class. Your XP, streak, badges and history stay with you.
              </span>
            </span>
          </label>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={pending} disabled={unchanged || (permanent && !agreed)}>
            {mode === "promote" ? "Move up" : mode === "switch_exam" ? "Switch exam" : "Save course"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
