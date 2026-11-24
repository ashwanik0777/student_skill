"use client";

import { CircleCheck, Info, Plus, TriangleAlert } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AwaitingConfirm, useConfirmSubmit } from "@/components/ui/confirm";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { createAnnouncementAction, type AnnouncementFormState } from "@/lib/actions/admin";
import { cn } from "@/lib/utils";

const TONES = [
  { value: "info", label: "Info", icon: Info },
  { value: "success", label: "Good news", icon: CircleCheck },
  { value: "warning", label: "Important", icon: TriangleAlert },
] as const;

type Audience = { value: string; label: string };

/** "New announcement" button; the form opens in a dialog and posting is confirmed in a toast. */
export function NewAnnouncementButton({ audiences, today }: { audiences: Audience[]; today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> New announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle>New announcement</DialogTitle>
        <DialogDescription>Students see it at the top of their dashboard and can dismiss it after reading.</DialogDescription>
        {/* Mounted only while open, so every new announcement starts from a clean form. */}
        {open && <AnnouncementForm audiences={audiences} today={today} onPosted={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function AnnouncementForm({ audiences, today, onPosted }: { audiences: Audience[]; today: string; onPosted: () => void }) {
  const id = useId();
  const [state, formAction, pending] = useActionState<AnnouncementFormState, FormData>(createAnnouncementAction, {});
  const [tone, setTone] = useState<(typeof TONES)[number]["value"]>("info");
  const [body, setBody] = useState("");
  const handled = useRef<AnnouncementFormState | null>(null);
  const { onSubmit, awaiting } = useConfirmSubmit((data) => {
    const audience = audiences.find((a) => a.value === data.get("audience"))?.label ?? "students";
    return { title: `Post this announcement to ${audience}?`, description: String(data.get("title") ?? "").trim() || undefined, confirmLabel: "Post" };
  });

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state;
      toast.success(state.message ?? "Announcement posted.");
      onPosted();
    }
  }, [state, onPosted]);

  const v = state.values;
  const busy = pending || awaiting;
  return (
    <form action={formAction} onSubmit={onSubmit} className="mt-5 space-y-4">
      <Field label="Title" htmlFor={`${id}-title`} error={state.errors?.title}>
        <Input id={`${id}-title`} name="title" defaultValue={v?.title} maxLength={120} placeholder="Sunday mock test moved to 6 PM" aria-invalid={!!state.errors?.title} autoFocus />
      </Field>
      <Field label="Message" htmlFor={`${id}-body`} error={state.errors?.body} hint={`${body.length}/600`}>
        <Textarea
          id={`${id}-body`}
          name="body"
          defaultValue={v?.body}
          maxLength={600}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Keep it short and clear — students see this at the top of their dashboard."
          className="min-h-24"
          aria-invalid={!!state.errors?.body}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Who should see it" htmlFor={`${id}-audience`} error={state.errors?.audience}>
          <Select id={`${id}-audience`} name="audience" defaultValue={v?.audience ?? "all"}>
            {audiences.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Show until (optional)" htmlFor={`${id}-ends`} error={state.errors?.endsOn} hint="Leave empty to keep it up until you hide it.">
          <Input id={`${id}-ends`} name="endsOn" type="date" min={today} defaultValue={v?.endsOn} />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Style</legend>
        <input type="hidden" name="tone" value={tone} />
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={tone === t.value}
              onClick={() => setTone(t.value)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors",
                tone === t.value ? "border-brand bg-brand-soft text-brand-ink" : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="size-4" /> {t.label}
            </button>
          ))}
        </div>
      </fieldset>
      {state.errors?.form && (
        <p className="rounded-xl border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm text-danger" role="alert">
          {state.errors.form}
        </p>
      )}
      <AwaitingConfirm show={awaiting} />
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button type="button" variant="ghost" disabled={busy}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" loading={busy}>
          Post announcement
        </Button>
      </div>
    </form>
  );
}
