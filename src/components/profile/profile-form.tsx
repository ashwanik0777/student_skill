"use client";

import { Check } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AwaitingConfirm, useConfirmSubmit } from "@/components/ui/confirm";
import { Field, Input, Select } from "@/components/ui/input";
import { updateProfile, type ProfileState } from "@/lib/actions/profile";
import { INDIAN_STATES } from "@/lib/india";

export type ProfileDefaults = { name: string; school: string | null; city: string | null; state: string | null };

/** Name / school / city / state inputs shared by onboarding and settings. */
export function ProfileFields({
  defaults,
  state,
  schoolRequired,
}: {
  defaults: ProfileDefaults;
  state: ProfileState;
  schoolRequired: boolean;
}) {
  const v = (key: keyof ProfileDefaults) => state.values?.[key] ?? defaults[key] ?? "";
  return (
    <>
      <Field label="Full name" htmlFor="name" error={state.errors?.name}>
        <Input id="name" name="name" defaultValue={v("name")} autoComplete="name" aria-invalid={!!state.errors?.name} />
      </Field>
      <Field
        label={schoolRequired ? "School" : "School or coaching institute (optional)"}
        htmlFor="school"
        error={state.errors?.school}
        hint="Used for your school leaderboard."
      >
        <Input
          id="school"
          name="school"
          defaultValue={v("school")}
          placeholder={schoolRequired ? "e.g. Kendriya Vidyalaya No. 1, Jaipur" : "e.g. your school or coaching centre"}
          autoComplete="organization"
          aria-invalid={!!state.errors?.school}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="City" htmlFor="city" error={state.errors?.city}>
          <Input id="city" name="city" defaultValue={v("city")} placeholder="e.g. Patna" autoComplete="address-level2" aria-invalid={!!state.errors?.city} />
        </Field>
        <Field label="State" htmlFor="state" error={state.errors?.state}>
          <Select id="state" name="state" defaultValue={v("state")} aria-invalid={!!state.errors?.state}>
            <option value="" disabled>
              Choose state
            </option>
            {INDIAN_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>
    </>
  );
}

/** Settings → personal details. */
export function ProfileForm({ defaults, schoolRequired }: { defaults: ProfileDefaults; schoolRequired: boolean }) {
  const [state, formAction, pending] = useActionState(updateProfile, {});
  const { onSubmit, awaiting } = useConfirmSubmit({ title: "Save your profile changes?", description: "Your name and school show on leaderboards.", confirmLabel: "Save" });
  useEffect(() => {
    if (state.ok) toast.success("Profile updated");
  }, [state]);
  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-5" noValidate>
      <ProfileFields defaults={defaults} state={state} schoolRequired={schoolRequired} />
      <AwaitingConfirm show={awaiting} />
      <Button type="submit" loading={pending || awaiting}>
        {!(pending || awaiting) && <Check />} Save changes
      </Button>
    </form>
  );
}
