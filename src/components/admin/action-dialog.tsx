"use client";

import { Slot } from "radix-ui";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AwaitingConfirm, confirmAndRun, confirmToast } from "@/components/ui/confirm";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { ActionResult } from "@/lib/actions/admin";

type Props = {
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
  /** Optional free-text reason (saved to the audit log). */
  reason?: { label: string; placeholder?: string };
  /** Type-to-confirm guard for destructive actions. */
  confirmText?: { label: string; expected: string };
  run: (input: { reason: string; confirm: string }) => Promise<ActionResult>;
  onSuccess?: () => void;
} & ({ trigger: React.ReactNode; open?: never; onOpenChange?: never } | { trigger?: never; open: boolean; onOpenChange: (open: boolean) => void });

/**
 * Every action is confirmed in a toast before it runs.
 * Plain actions (delete, restore, sign out…) ask straight from the trigger. Actions that need input first — a reason
 * or a typed confirmation — collect it in a dialog, then ask in the toast.
 */
export function ActionDialog(props: Props) {
  if (props.trigger && !props.reason && !props.confirmText) return <ToastTrigger {...props} />;
  return <InputDialog {...props} />;
}

function ToastTrigger({ trigger, title, description, confirmLabel, tone, run, onSuccess }: Props) {
  const [pending, startTransition] = useTransition();
  return (
    <Slot.Root
      aria-busy={pending || undefined}
      aria-disabled={pending || undefined}
      onClick={(e) => {
        // Triggers can sit inside another form (e.g. "Delete course" next to "Save course"): never submit it.
        e.preventDefault();
        if (pending) return;
        startTransition(async () => {
          const res = await confirmAndRun({ title, description, confirmLabel, tone }, () => run({ reason: "", confirm: "" }));
          if (res?.ok) onSuccess?.();
        });
      }}
    >
      {trigger}
    </Slot.Root>
  );
}

function InputDialog({ title, description, confirmLabel, tone = "primary", reason, confirmText, run, onSuccess, ...rest }: Props) {
  const id = useId();
  const [innerOpen, setInnerOpen] = useState(false);
  const open = rest.open ?? innerOpen;
  const [pending, startTransition] = useTransition();
  const [awaiting, setAwaiting] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [confirm, setConfirm] = useState("");
  const blocked = !!confirmText && confirm.trim().toLowerCase() !== confirmText.expected.toLowerCase();
  const busy = pending || awaiting;

  function setOpen(next: boolean) {
    if (!next) {
      setReasonText("");
      setConfirm("");
    }
    if (rest.onOpenChange) rest.onOpenChange(next);
    else setInnerOpen(next);
  }

  async function submit() {
    setAwaiting(true);
    const ok = await confirmToast({ title, description, confirmLabel, tone });
    setAwaiting(false);
    if (!ok) return;
    startTransition(async () => {
      const res = await run({ reason: reasonText, confirm });
      if (res.ok) {
        toast.success(res.message);
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      {rest.trigger && <DialogTrigger asChild>{rest.trigger}</DialogTrigger>}
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (blocked || busy) return;
            void submit();
          }}
        >
          {reason && (
            <Field label={reason.label} htmlFor={`${id}-reason`}>
              <Textarea
                id={`${id}-reason`}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder={reason.placeholder}
                maxLength={300}
                className="min-h-20"
              />
            </Field>
          )}
          {confirmText && (
            <Field label={confirmText.label} htmlFor={`${id}-confirm`}>
              <Input id={`${id}-confirm`} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" spellCheck={false} />
            </Field>
          )}
          <AwaitingConfirm show={awaiting} />
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={busy}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant={tone === "danger" ? "danger" : "primary"} loading={busy} disabled={blocked}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
