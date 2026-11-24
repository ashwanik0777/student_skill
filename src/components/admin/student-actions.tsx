"use client";

import { Ban, LogOut, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteAccountAction, restoreAccountAction, signOutEverywhereAction, suspendAccountAction } from "@/lib/actions/admin";
import { ActionDialog } from "./action-dialog";

export function StudentActions({ id, name, email, suspended }: { id: string; name: string; email: string; suspended: boolean }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      {suspended ? (
        <ActionDialog
          trigger={
            <Button variant="outline">
              <RotateCcw /> Restore account
            </Button>
          }
          title={`Restore ${name}?`}
          description="They’ll be able to sign in again with all their progress intact."
          confirmLabel="Restore account"
          run={() => restoreAccountAction(id)}
        />
      ) : (
        <ActionDialog
          trigger={
            <Button variant="outline">
              <Ban /> Suspend
            </Button>
          }
          title={`Suspend ${name}?`}
          description="They’re signed out right away and can’t sign in until you restore the account. Their progress is kept."
          confirmLabel="Suspend account"
          tone="danger"
          reason={{ label: "Reason (only staff can see this)", placeholder: "e.g. Posting spam in the doubt forum" }}
          run={({ reason }) => suspendAccountAction(id, reason)}
        />
      )}
      <ActionDialog
        trigger={
          <Button variant="outline">
            <LogOut /> Sign out everywhere
          </Button>
        }
        title={`Sign ${name} out of every device?`}
        description="Useful if they lost a phone or shared their password. They can sign in again straight away."
        confirmLabel="Sign out everywhere"
        run={() => signOutEverywhereAction(id)}
      />
      <ActionDialog
        trigger={
          <Button variant="ghost" className="text-danger hover:bg-danger-soft">
            <Trash2 /> Delete account
          </Button>
        }
        title={`Delete ${name}’s account?`}
        description="This permanently deletes their tests, results, badges, tutor chats, doubts and answers. It can’t be undone."
        confirmLabel="Delete permanently"
        tone="danger"
        confirmText={{ label: `Type ${email} to confirm`, expected: email }}
        run={({ confirm }) => deleteAccountAction(id, confirm)}
        onSuccess={() => router.replace("/admin/students")}
      />
    </div>
  );
}
