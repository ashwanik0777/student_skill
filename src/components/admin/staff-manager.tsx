"use client";

import { Ban, Copy, KeyRound, MoreHorizontal, RotateCcw, ShieldCheck, UserMinus, UserPlus, Wand2 } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { AwaitingConfirm, confirmAndRun, confirmToast, useConfirmSubmit } from "@/components/ui/confirm";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, Input } from "@/components/ui/input";
import {
  createSubAdminAction,
  removeStaffAccessAction,
  resetStaffPasswordAction,
  restoreAccountAction,
  suspendAccountAction,
  updateStaffPermissionsAction,
  type StaffFormState,
} from "@/lib/actions/admin";
import { normalisePermissions, type Permission } from "@/lib/admin/permissions";
import { cn } from "@/lib/utils";
import { ActionDialog } from "./action-dialog";
import { PermissionChecklist } from "./permission-checklist";

/** 14-character password without look-alike characters (0/O, 1/l/I). */
function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#%+";
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function PasswordWithGenerator({ id, name, value, onChange }: { id: string; name?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <div className="min-w-0 flex-1">
        <PasswordInput id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" />
      </div>
      <Button type="button" variant="outline" size="icon" title="Generate a strong password" aria-label="Generate a strong password" onClick={() => onChange(generatePassword())}>
        <Wand2 />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        title="Copy password"
        aria-label="Copy password"
        disabled={!value}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            toast.success("Password copied");
          } catch {
            toast.error("Couldn't copy — select the text instead.");
          }
        }}
      >
        <Copy />
      </Button>
    </div>
  );
}

/* ───────────────────────────── Add sub-admin ───────────────────────────── */

export function AddStaffDialog({ allowed }: { allowed: Permission[] }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [permissions, setPermissions] = useState<Permission[]>(() => (["students.view", "community.moderate"] as Permission[]).filter((p) => allowed.includes(p)));
  const [password, setPassword] = useState("");
  const [state, formAction, pending] = useActionState<StaffFormState, FormData>(createSubAdminAction, {});
  const handled = useRef<StaffFormState | null>(null);
  const { onSubmit, awaiting } = useConfirmSubmit((d) => {
    const who = String(d.get(mode === "new" ? "name" : "email") ?? "").trim() || "this person";
    const count = `${permissions.length} permission${permissions.length === 1 ? "" : "s"}`;
    return mode === "new"
      ? { title: `Create sub-admin ${who}?`, description: `They can sign in straight away with ${count}.`, confirmLabel: "Create" }
      : { title: `Give staff access to ${who}?`, description: `Their account gets ${count}.`, confirmLabel: "Give access" };
  });
  const busy = pending || awaiting;

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state;
      toast.success(state.message ?? "Sub-admin added.");
      setOpen(false);
      setPassword("");
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> Add sub-admin
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogTitle>Add a sub-admin</DialogTitle>
        <DialogDescription>They can only open the sections you tick below. You can change this any time.</DialogDescription>

        <form action={formAction} onSubmit={onSubmit} className="mt-5 space-y-4">
          <input type="hidden" name="mode" value={mode} />
          <div className="grid grid-cols-2 rounded-xl border border-border bg-surface-2 p-1" role="radiogroup" aria-label="Account">
            {(
              [
                ["new", "New account"],
                ["existing", "Existing account"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  "h-9 rounded-lg text-sm font-medium transition-colors",
                  mode === value ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "new" && (
            <Field label="Full name" htmlFor={`${id}-name`} error={state.errors?.name}>
              <Input id={`${id}-name`} name="name" autoComplete="off" placeholder="Neha Singh" aria-invalid={!!state.errors?.name} />
            </Field>
          )}
          <Field
            label="Email"
            htmlFor={`${id}-email`}
            error={state.errors?.email}
            hint={mode === "existing" ? "The email they already use to sign in to TestPrep." : undefined}
          >
            <Input id={`${id}-email`} name="email" type="email" autoComplete="off" placeholder="neha@school.com" aria-invalid={!!state.errors?.email} />
          </Field>
          {mode === "new" && (
            <Field
              label="Password"
              htmlFor={`${id}-password`}
              error={state.errors?.password}
              hint="Share it with them privately. They can sign in straight away."
            >
              <PasswordWithGenerator id={`${id}-password`} name="password" value={password} onChange={setPassword} />
            </Field>
          )}

          <PermissionChecklist value={permissions} onChange={setPermissions} allowed={allowed} />
          {state.errors?.permissions && <p className="text-[13px] text-danger">{state.errors.permissions}</p>}
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
              {mode === "new" ? "Create sub-admin" : "Give staff access"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────────── Row actions ───────────────────────────── */

function EditPermissionsDialog({
  member,
  allowed,
  open,
  onOpenChange,
}: {
  member: { id: string; name: string; permissions: string[] };
  allowed: Permission[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [value, setValue] = useState<Permission[]>(() => normalisePermissions(member.permissions));
  const [pending, startTransition] = useTransition();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (next) setValue(normalisePermissions(member.permissions));
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogTitle>Permissions for {member.name}</DialogTitle>
        <DialogDescription>Changes apply on their next click — no need to sign out.</DialogDescription>
        <div className="mt-5">
          <PermissionChecklist value={value} onChange={setValue} allowed={allowed} />
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            loading={pending}
            disabled={value.length === 0}
            onClick={() =>
              startTransition(async () => {
                const ok = await confirmToast({
                  title: `Save permissions for ${member.name}?`,
                  description: `${value.length} permission${value.length === 1 ? "" : "s"} — applies on their next click.`,
                  confirmLabel: "Save",
                });
                if (!ok) return;
                const res = await updateStaffPermissionsAction(member.id, value);
                if (res.ok) {
                  toast.success(res.message);
                  onOpenChange(false);
                } else toast.error(res.error);
              })
            }
          >
            Save permissions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ member, open, onOpenChange }: { member: { id: string; name: string }; open: boolean; onOpenChange: (open: boolean) => void }) {
  const id = useId();
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (next) setPassword(generatePassword());
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogTitle>Reset password for {member.name}</DialogTitle>
        <DialogDescription>They’ll be signed out everywhere and must use the new password.</DialogDescription>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const ok = await confirmToast({
                title: `Reset ${member.name}’s password?`,
                description: "They’re signed out everywhere and must use the new password.",
                confirmLabel: "Reset password",
                tone: "danger",
              });
              if (!ok) return;
              const res = await resetStaffPasswordAction(member.id, password);
              if (res.ok) {
                toast.success(res.message);
                onOpenChange(false);
              } else toast.error(res.error);
            });
          }}
        >
          <Field label="New password" htmlFor={`${id}-pw`}>
            <PasswordWithGenerator id={`${id}-pw`} value={password} onChange={setPassword} />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={pending} disabled={password.length < 8}>
              Set new password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type StaffMember = { id: string; name: string; email: string; role: "admin" | "sub_admin"; permissions: string[]; suspended: boolean };

export function StaffRowActions({ member, isSelf, allowed, manageable }: { member: StaffMember; isSelf: boolean; allowed: Permission[]; manageable: boolean }) {
  const [dialog, setDialog] = useState<null | "permissions" | "password" | "suspend">(null);
  if (member.role === "admin" || isSelf || !manageable) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" /> {isSelf ? "You" : member.role === "admin" ? "Managed via CLI" : "Outside your permissions"}
      </span>
    );
  }
  const close = (open: boolean) => !open && setDialog(null);
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button variant="outline" size="sm" onClick={() => setDialog("permissions")}>
        Permissions
      </Button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${member.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => setDialog("password")}>
            <KeyRound /> Reset password
          </DropdownMenuItem>
          {member.suspended ? (
            <DropdownMenuItem
              onSelect={() =>
                void confirmAndRun({ title: `Restore ${member.name}?`, description: "They can sign in again with the same permissions.", confirmLabel: "Restore" }, () =>
                  restoreAccountAction(member.id),
                )
              }
            >
              <RotateCcw /> Restore access
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setDialog("suspend")}>
              <Ban /> Suspend
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              void confirmAndRun(
                {
                  title: `Remove staff access for ${member.name}?`,
                  description: "Their account stays, but it becomes a normal student account without any admin pages.",
                  confirmLabel: "Remove access",
                  tone: "danger",
                },
                () => removeStaffAccessAction(member.id),
              )
            }
            className="text-danger focus:text-danger"
          >
            <UserMinus /> Remove staff access
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditPermissionsDialog member={member} allowed={allowed} open={dialog === "permissions"} onOpenChange={close} />
      <ResetPasswordDialog member={member} open={dialog === "password"} onOpenChange={close} />
      <ActionDialog
        open={dialog === "suspend"}
        onOpenChange={close}
        title={`Suspend ${member.name}?`}
        description="They’re signed out right away and can’t sign in until you restore them."
        confirmLabel="Suspend"
        tone="danger"
        reason={{ label: "Reason (optional)" }}
        run={({ reason }) => suspendAccountAction(member.id, reason)}
      />
    </div>
  );
}
