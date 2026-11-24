"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/confirm";
import { deleteAnnouncementAction, setAnnouncementActiveAction } from "@/lib/actions/admin";

export function AnnouncementActions({ id, title, active }: { id: string; title: string; active: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <ConfirmButton
        variant="ghost"
        size="sm"
        confirm={
          active
            ? { title: "Hide this announcement?", description: `“${title}” stops showing on student dashboards.`, confirmLabel: "Hide", tone: "danger" }
            : { title: "Show this announcement again?", description: `“${title}” goes back on student dashboards.`, confirmLabel: "Show" }
        }
        run={() => setAnnouncementActiveAction(id, !active)}
      >
        {active ? <EyeOff /> : <Eye />}
        {active ? "Hide" : "Show"}
      </ConfirmButton>
      <ConfirmButton
        variant="ghost"
        size="sm"
        className="text-danger hover:bg-danger-soft"
        aria-label={`Delete ${title}`}
        confirm={{ title: "Delete this announcement?", description: `“${title}” will disappear from every dashboard.`, confirmLabel: "Delete", tone: "danger" }}
        run={() => deleteAnnouncementAction(id)}
      >
        <Trash2 />
      </ConfirmButton>
    </div>
  );
}
