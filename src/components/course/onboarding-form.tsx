"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useActionState, useCallback, useState } from "react";
import { ProfileFields, type ProfileDefaults } from "@/components/profile/profile-form";
import { Button } from "@/components/ui/button";
import { AwaitingConfirm, useConfirmSubmit } from "@/components/ui/confirm";
import { completeOnboarding } from "@/lib/actions/profile";
import { useCatalogLabels } from "@/lib/catalog/context";
import type { Track } from "@/lib/catalog/shared";
import { cn } from "@/lib/utils";
import { TrackPicker } from "./track-picker";

/** Two steps: what you're preparing for → about you. Both live in one form so nothing is lost between steps. */
export function OnboardingForm({ defaults }: { defaults: ProfileDefaults }) {
  const [state, formAction, pending] = useActionState(completeOnboarding, {});
  const [step, setStep] = useState<1 | 2>(1);
  const [track, setTrack] = useState<Track | null>(null);
  const onTrack = useCallback((t: Track | null) => setTrack(t), []);
  const { trackLabel } = useCatalogLabels();
  const { onSubmit, awaiting } = useConfirmSubmit(() =>
    track ? { title: `Start preparing for ${trackLabel(track)}?`, description: "You can still fix it for a few days after signing up.", confirmLabel: "Start learning" } : null,
  );

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate>
      <div className="mb-6 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className={cn("h-1.5 w-10 rounded-full", "bg-brand")} />
        <span className={cn("h-1.5 w-10 rounded-full", step === 2 ? "bg-brand" : "bg-surface-3")} />
        <span className="ml-2">Step {step} of 2 · {step === 1 ? "Your goal" : "About you"}</span>
      </div>

      {/* Step 1 stays mounted (hidden) so its inputs are submitted with the form. */}
      <div className={cn(step !== 1 && "hidden")}>
        <TrackPicker onChange={onTrack} />
        {state.errors?.track && <p className="mt-4 text-sm text-danger">{state.errors.track}</p>}
        <Button type="button" size="lg" className="mt-8 w-full" disabled={!track} onClick={() => setStep(2)}>
          Continue <ArrowRight />
        </Button>
      </div>

      <div className={cn("space-y-5", step !== 2 && "hidden")}>
        {track && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-soft-border bg-brand-soft px-4 py-3 text-sm">
            <span>
              Preparing for <span className="font-semibold text-brand-ink">{trackLabel(track)}</span>
            </span>
            <button type="button" onClick={() => setStep(1)} className="shrink-0 text-xs font-medium text-brand-ink hover:underline">
              Change
            </button>
          </div>
        )}
        <ProfileFields defaults={defaults} state={state} schoolRequired={track?.kind === "school"} />
        {state.errors?.form && <p className="text-sm text-danger">{state.errors.form}</p>}
        <AwaitingConfirm show={awaiting} />
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
          <Button type="button" variant="outline" size="lg" onClick={() => setStep(1)}>
            <ArrowLeft /> Back
          </Button>
          <Button type="submit" size="lg" className="flex-1" loading={pending || awaiting} disabled={!track}>
            Start learning {!pending && <ArrowRight />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Picked something by mistake? You can fix your board, class or exam for a few days after signing up. Later you move up once a year —
          your XP, streak and badges always come with you.
        </p>
      </div>
    </form>
  );
}
