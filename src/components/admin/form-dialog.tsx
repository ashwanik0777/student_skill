"use client";

import { Children, cloneElement, createContext, isValidElement, useActionState, useContext, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AwaitingConfirm, useConfirmSubmit, type ConfirmOptions } from "@/components/ui/confirm";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { FormResult } from "@/lib/actions/catalog";
import { cn } from "@/lib/utils";

type FormAction = (prev: FormResult, formData: FormData) => Promise<FormResult>;
type Confirm = ConfirmOptions | ((data: FormData) => ConfirmOptions | null);

const ErrorsContext = createContext<Record<string, string>>({});

/** Field-level error from the surrounding ActionForm / FormDialog. */
export function useFieldError(name: string) {
  return useContext(ErrorsContext)[name];
}

export function FormError({ name = "form", className }: { name?: string; className?: string }) {
  const error = useFieldError(name);
  if (!error) return null;
  return (
    <p className={cn("rounded-xl border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm text-danger", className)} role="alert">
      {error}
    </p>
  );
}

/** Convenience: the `error` prop for a <Field>. */
export function fieldError(errors: Record<string, string> | undefined, name: string) {
  return errors?.[name];
}

function useFormResult(action: FormAction, onSuccess?: (state: FormResult) => void) {
  const [state, formAction, pending] = useActionState<FormResult, FormData>(action, {});
  const handled = useRef<FormResult | null>(null);
  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state;
      if (state.message) toast.success(state.message);
      onSuccess?.(state);
    }
  }, [state, onSuccess]);
  return { state, formAction, pending };
}

/** Inline form bound to a server action; shows field errors and a success toast. */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  className,
  resetOnSuccess,
  onSuccess,
  footer,
  confirm,
}: {
  action: FormAction;
  children: React.ReactNode | ((state: FormResult) => React.ReactNode);
  submitLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: (state: FormResult) => void;
  /** Extra controls rendered left of the submit button. */
  footer?: React.ReactNode;
  /** Ask in a toast before submitting. */
  confirm?: Confirm;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { onSubmit, awaiting } = useConfirmSubmit(confirm);
  const { state, formAction, pending } = useFormResult(action, (s) => {
    if (resetOnSuccess) formRef.current?.reset();
    onSuccess?.(s);
  });
  return (
    <ErrorsContext.Provider value={state.errors ?? {}}>
      <form ref={formRef} action={formAction} onSubmit={onSubmit} className={cn("space-y-4", className)}>
        {typeof children === "function" ? children(state) : children}
        <FormError />
        <AwaitingConfirm show={awaiting} />
        <div className="flex items-center justify-between gap-3 pt-1">
          <div>{footer}</div>
          <Button type="submit" loading={pending || awaiting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </ErrorsContext.Provider>
  );
}

/** Dialog with a form bound to a server action; closes itself on success. */
export function FormDialog({
  trigger,
  title,
  description,
  action,
  children,
  submitLabel = "Save",
  className,
  onSuccess,
  confirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action: FormAction;
  children: React.ReactNode | ((state: FormResult) => React.ReactNode);
  submitLabel?: string;
  className?: string;
  onSuccess?: (state: FormResult) => void;
  /** Ask in a toast before submitting. */
  confirm?: Confirm;
}) {
  const [open, setOpen] = useState(false);
  const { onSubmit, awaiting } = useConfirmSubmit(confirm);
  const { state, formAction, pending } = useFormResult(action, (s) => {
    setOpen(false);
    onSuccess?.(s);
  });
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && !awaiting && setOpen(next)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={className}>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        {open && (
          <ErrorsContext.Provider value={state.errors ?? {}}>
            <form action={formAction} onSubmit={onSubmit} className="mt-5 space-y-4">
              {typeof children === "function" ? children(state) : children}
              <FormError />
              <AwaitingConfirm show={awaiting} />
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" disabled={pending || awaiting}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" loading={pending || awaiting}>
                  {submitLabel}
                </Button>
              </div>
            </form>
          </ErrorsContext.Provider>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Checkbox styled like the rest of the admin forms; submits "on" when checked. */
export function Check({ name, label, hint, defaultChecked, disabled }: { name: string; label: string; hint?: string; defaultChecked?: boolean; disabled?: boolean }) {
  return (
    <label className={cn("flex items-start gap-3 rounded-xl border border-border bg-surface px-3.5 py-3", disabled ? "opacity-60" : "cursor-pointer hover:border-border-strong")}>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} disabled={disabled} className="mt-0.5 size-4 accent-brand" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-[13px] text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

/**
 * A <Field> that reads its own error from the form context. The control gets a unique id: Next keeps previous
 * pages mounted (hidden) during navigation, so a fixed id like "name" would exist twice and break the label link.
 */
export function FieldWithError({ name, label, hint, children }: { name: string; label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  const error = useFieldError(name);
  const id = useId();
  const kids = Children.toArray(children);
  const first = kids[0];
  const control = isValidElement<{ id?: string }>(first) ? cloneElement(first, { id }) : first;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {control}
      {kids.slice(1)}
      {error ? (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
