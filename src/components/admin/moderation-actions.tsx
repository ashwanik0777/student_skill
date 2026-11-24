"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deletePostAction, deleteReplyAction } from "@/lib/actions/admin";
import { ActionDialog } from "./action-dialog";

export function DeletePostButton({ id, title, afterDelete }: { id: string; title: string; afterDelete?: string }) {
  const router = useRouter();
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft">
          <Trash2 /> Remove
        </Button>
      }
      title="Remove this doubt?"
      description={`“${title}” and all of its answers will be deleted for everyone.`}
      confirmLabel="Remove doubt"
      tone="danger"
      reason={{ label: "Reason (saved in the audit log)", placeholder: "e.g. Spam, abusive language, exam leak" }}
      run={({ reason }) => deletePostAction(id, reason)}
      onSuccess={afterDelete ? () => router.replace(afterDelete) : undefined}
    />
  );
}

export function DeleteReplyButton({ id, isAi }: { id: string; isAi: boolean }) {
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft">
          <Trash2 /> Remove
        </Button>
      }
      title={isAi ? "Remove the AI answer?" : "Remove this answer?"}
      description="The answer is deleted for everyone. The doubt itself stays."
      confirmLabel="Remove answer"
      tone="danger"
      reason={{ label: "Reason (saved in the audit log)", placeholder: "e.g. Wrong solution, off-topic" }}
      run={({ reason }) => deleteReplyAction(id, reason)}
    />
  );
}
