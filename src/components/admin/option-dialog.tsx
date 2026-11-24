"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { deleteOptionAction, saveOptionAction } from "@/lib/actions/catalog";
import type { CatalogOption } from "@/lib/catalog/shared";
import { ActionDialog } from "./action-dialog";
import { Check, FieldWithError, FormDialog } from "./form-dialog";

const KIND_LABEL = { board: "board", stream: "stream", exam: "exam" } as const;

export function OptionDialog({ kind, option }: { kind: CatalogOption["kind"]; option?: CatalogOption }) {
  const editing = !!option;
  return (
    <FormDialog
      title={editing ? `Edit ${KIND_LABEL[kind]}` : `Add a ${KIND_LABEL[kind]}`}
      description={
        kind === "board"
          ? "Boards appear in the sign-up picker once a course uses them."
          : kind === "stream"
            ? "Streams group Class 11–12 subjects (and CUET domains). The group decides which students share a leaderboard."
            : "Competitive exams students can prepare for after school."
      }
      submitLabel={editing ? "Save" : "Add"}
      confirm={(d) =>
        editing
          ? { title: `Save changes to ${String(d.get("name") ?? "").trim() || option.name}?`, description: "Every course and student using it sees the change.", confirmLabel: "Save" }
          : { title: `Add “${String(d.get("name") ?? "").trim()}” as a ${KIND_LABEL[kind]}?`, confirmLabel: "Add" }
      }
      trigger={
        editing ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${option.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus /> Add {KIND_LABEL[kind]}
          </Button>
        )
      }
      action={saveOptionAction}
    >
      <input type="hidden" name="kind" value={kind} />
      {editing && <input type="hidden" name="originalId" value={option.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldWithError name="id" label="ID" hint={editing ? "Can't be changed." : "Short, lowercase, e.g. mpboard"}>
          <Input id="id" name="id" defaultValue={option?.id} disabled={editing} placeholder="e.g. cbse" autoComplete="off" />
        </FieldWithError>
        <FieldWithError name="short" label="Short name">
          <Input id="short" name="short" defaultValue={option?.short} placeholder={kind === "exam" ? "JEE" : kind === "stream" ? "PCM" : "CBSE"} />
        </FieldWithError>
      </div>
      <FieldWithError name="name" label="Name">
        <Input id="name" name="name" defaultValue={option?.name} placeholder={kind === "exam" ? "JEE Main & Advanced" : kind === "stream" ? "Science (PCM)" : "CBSE"} />
      </FieldWithError>
      <FieldWithError name="description" label={kind === "board" ? "Full name" : "Description"} hint="Shown under the option in the sign-up picker.">
        <Input id="description" name="description" defaultValue={option?.description ?? ""} />
      </FieldWithError>
      {kind === "board" && (
        <FieldWithError name="note" label="Books / note" hint='e.g. "NCERT books" — also used in the AI audience line.'>
          <Input id="note" name="note" defaultValue={option?.note ?? ""} />
        </FieldWithError>
      )}
      {kind === "stream" && (
        <FieldWithError name="groupKey" label="Cohort group" hint="Streams in the same group share a leaderboard and doubt forum.">
          <Select id="groupKey" name="groupKey" defaultValue={option?.groupKey ?? "science"}>
            <option value="science">Science</option>
            <option value="commerce">Commerce</option>
            <option value="arts">Arts</option>
            <option value="">Own group (same as ID)</option>
          </Select>
        </FieldWithError>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldWithError name="sort" label="Order" hint="Lower numbers first.">
          <Input id="sort" name="sort" type="number" min={0} max={999} defaultValue={option?.sort ?? 0} />
        </FieldWithError>
        <div className="space-y-2 pt-6">
          <Check name="active" label="Visible to students" defaultChecked={option?.active ?? true} />
        </div>
      </div>
      {kind === "exam" && <Check name="needsStream" label="Students also pick a stream" hint="For exams with domain subjects (e.g. CUET)." defaultChecked={option?.needsStream ?? false} />}
    </FormDialog>
  );
}

export function DeleteOptionButton({ option }: { option: CatalogOption }) {
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="icon-sm" className="text-danger hover:bg-danger-soft" aria-label={`Delete ${option.name}`}>
          <Trash2 />
        </Button>
      }
      title={`Delete ${option.name}?`}
      description="Only possible when no course uses it."
      confirmLabel="Delete"
      tone="danger"
      run={() => deleteOptionAction(option.kind, option.id)}
    />
  );
}
