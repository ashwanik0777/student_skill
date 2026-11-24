"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

export type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  /** "danger" for deletes, suspensions and switching things off. */
  tone?: "primary" | "danger";
};

type Result = { ok: boolean; message?: string; error?: string };

const ACTION_BASE = "!h-8 !rounded-lg !px-3 !text-xs !font-semibold";

/** Only one confirmation is open at a time; a newer one cancels the older one. */
let cancelOpen: (() => void) | null = null;
// Each question gets its own toast id: reusing one id would revive a toast that is still animating out.
let seq = 0;

/**
 * Asks in a toast and resolves true only when the person clicks the confirm button.
 * Cancel, dismiss or timing out all resolve false — nothing happens without an explicit yes.
 */
export function confirmToast({ title, description, confirmLabel = "Confirm", tone = "primary" }: ConfirmOptions): Promise<boolean> {
  cancelOpen?.();
  const id = `confirm-${++seq}`;
  return new Promise((resolve) => {
    let settled = false;
    // Keyboard: Enter confirms, Escape cancels (also while a dialog keeps focus inside itself). A held-down key
    // (auto-repeat) never confirms, and Enter on the toast's own buttons is left to those buttons.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== "Escape") return;
      const target = e.target instanceof Element ? e.target : null;
      if (e.key === "Enter" && (e.repeat || e.shiftKey || e.altKey || e.metaKey || e.ctrlKey || target?.tagName === "TEXTAREA" || target?.closest("[data-sonner-toast]"))) return;
      e.preventDefault();
      e.stopPropagation();
      done(e.key === "Enter");
      toast.dismiss(id);
    };
    const done = (value: boolean) => {
      if (settled) return;
      settled = true;
      if (cancelOpen === cancel) cancelOpen = null;
      window.removeEventListener("keydown", onKey, true);
      resolve(value);
    };
    const cancel = () => {
      done(false);
      toast.dismiss(id);
    };
    cancelOpen = cancel;
    window.addEventListener("keydown", onKey, true);
    toast(title, {
      id,
      description,
      duration: 15_000,
      action: { label: confirmLabel, onClick: () => done(true) },
      cancel: { label: "Cancel", onClick: () => done(false) },
      onDismiss: () => done(false),
      onAutoClose: () => done(false),
      classNames: {
        actionButton: `${ACTION_BASE} ${tone === "danger" ? "!bg-danger !text-white" : "!bg-brand !text-brand-foreground"}`,
        cancelButton: `${ACTION_BASE} !bg-surface-2 !text-foreground`,
      },
    });
  });
}

/** Confirm, then run a server action and report the result in a toast. Returns null when cancelled. */
export async function confirmAndRun(options: ConfirmOptions, run: () => Promise<Result>): Promise<Result | null> {
  if (!(await confirmToast(options))) return null;
  const id = toast.loading("Working…");
  try {
    const result = await run();
    if (result.ok) toast.success(result.message ?? "Done.", { id });
    else toast.error(result.error ?? "Something went wrong.", { id });
    return result;
  } catch {
    toast.error("Something went wrong. Please try again.", { id });
    return { ok: false, error: "failed" };
  }
}

/** A button whose action only runs after the toast confirmation. */
export function ConfirmButton({
  confirm,
  run,
  onSuccess,
  children,
  ...props
}: Omit<ButtonProps, "onClick" | "loading"> & {
  confirm: ConfirmOptions;
  run: () => Promise<Result>;
  onSuccess?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      {...props}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await confirmAndRun(confirm, run);
          if (result?.ok) onSuccess?.();
        })
      }
    >
      {children}
    </Button>
  );
}

/**
 * For <form action={…}>: the first submit asks in a toast; on "Confirm" the form is submitted again for real.
 * `confirm` may depend on what was typed (e.g. "Post to Class 10?").
 */
export function useConfirmSubmit(confirm?: ConfirmOptions | ((data: FormData) => ConfirmOptions | null)) {
  const approved = useRef(false);
  const [awaiting, setAwaiting] = useState(false);
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!confirm) return;
    if (approved.current) {
      approved.current = false;
      return;
    }
    event.preventDefault();
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const options = typeof confirm === "function" ? confirm(new FormData(form)) : confirm;
    const submit = () => {
      approved.current = true;
      form.requestSubmit(submitter && form.contains(submitter) ? submitter : undefined);
    };
    if (!options) return submit();
    setAwaiting(true);
    void confirmToast(options).then((ok) => {
      setAwaiting(false);
      if (ok) submit();
    });
  };
  return { onSubmit, awaiting };
}

/** Hint shown next to a form's buttons while its toast confirmation is open. */
export function AwaitingConfirm({ show }: { show: boolean }) {
  return (
    <p role="status" className={show ? "text-xs text-muted-foreground" : "sr-only"}>
      {show && (
        <>
          Confirm in the notification above<span className="max-sm:hidden"> — Enter to confirm, Esc to cancel</span>.
        </>
      )}
    </p>
  );
}
