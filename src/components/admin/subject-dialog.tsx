"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { createElement, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteSubjectAction, saveSubjectAction, saveSyllabusAction } from "@/lib/actions/catalog";
import { SUBJECT_ICON_NAMES, SUBJECT_TONES, SUBJECT_TONE_NAMES, iconFor, toneFor } from "@/lib/catalog/icons";
import type { SubjectMeta } from "@/lib/catalog/shared";
import { cn } from "@/lib/utils";
import { ActionDialog } from "./action-dialog";
import { Check, FieldWithError, FormDialog } from "./form-dialog";

export function SubjectDialog({ subject }: { subject?: SubjectMeta }) {
  const editing = !!subject;
  const [icon, setIcon] = useState(subject?.icon ?? "BookOpenText");
  const [tone, setTone] = useState(subject?.tone ?? "sky");
  return (
    <FormDialog
      title={editing ? `Edit ${subject.name}` : "Add a subject"}
      description="Subjects are shared by every course; each course picks which ones it teaches."
      submitLabel={editing ? "Save" : "Add subject"}
      className="max-w-lg"
      confirm={(d) =>
        editing
          ? { title: `Save changes to ${String(d.get("name") ?? "").trim() || subject.name}?`, description: "Every course that teaches it shows the new name, icon and colour.", confirmLabel: "Save" }
          : { title: `Add the subject “${String(d.get("name") ?? "").trim()}”?`, confirmLabel: "Add" }
      }
      trigger={
        editing ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${subject.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button>
            <Plus /> Add subject
          </Button>
        )
      }
      action={saveSubjectAction}
    >
      {editing && <input type="hidden" name="originalSlug" value={subject.slug} />}
      <input type="hidden" name="icon" value={icon} />
      <input type="hidden" name="tone" value={tone} />
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
        <span className={cn("grid size-10 place-items-center rounded-xl", toneFor(tone).soft)}>
          {createElement(iconFor(icon), { className: "size-5" })}
        </span>
        <span className="text-sm text-muted-foreground">Preview of the subject tile</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FieldWithError name="slug" label="ID" hint={editing ? "Can't be changed." : "e.g. sanskrit"}>
          <Input id="slug" name="slug" defaultValue={subject?.slug} disabled={editing} autoComplete="off" />
        </FieldWithError>
        <FieldWithError name="name" label="Name">
          <Input id="name" name="name" defaultValue={subject?.name} placeholder="Sanskrit" />
        </FieldWithError>
        <FieldWithError name="short" label="Short">
          <Input id="short" name="short" defaultValue={subject?.short} placeholder="SKT" maxLength={12} />
        </FieldWithError>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Icon</legend>
        <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
          {SUBJECT_ICON_NAMES.map((name) => {
            return (
              <button
                key={name}
                type="button"
                title={name}
                aria-pressed={icon === name}
                onClick={() => setIcon(name)}
                className={cn("grid aspect-square place-items-center rounded-lg border transition-colors", icon === name ? "border-brand bg-brand-soft text-brand-ink" : "border-border hover:bg-surface-2")}
              >
                {createElement(iconFor(name), { className: "size-4" })}
              </button>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Colour</legend>
        <div className="flex flex-wrap gap-1.5">
          {SUBJECT_TONE_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              title={name}
              aria-pressed={tone === name}
              onClick={() => setTone(name)}
              className={cn("size-7 rounded-full border-2 transition-transform", SUBJECT_TONES[name].solid, tone === name ? "scale-110 border-foreground" : "border-transparent")}
            />
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldWithError name="sort" label="Order">
          <Input id="sort" name="sort" type="number" min={0} max={999} defaultValue={subject?.sort ?? 0} />
        </FieldWithError>
        <div className="pt-6">
          <Check name="active" label="Active" defaultChecked={subject?.active ?? true} />
        </div>
      </div>
    </FormDialog>
  );
}

export function DeleteSubjectButton({ subject }: { subject: SubjectMeta }) {
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="icon-sm" className="text-danger hover:bg-danger-soft" aria-label={`Delete ${subject.name}`}>
          <Trash2 />
        </Button>
      }
      title={`Delete ${subject.name}?`}
      description="Only possible when no course or chapter list uses it."
      confirmLabel="Delete"
      tone="danger"
      run={() => deleteSubjectAction(subject.slug)}
    />
  );
}

export function SyllabusDialog({ subjects, syllabus }: { subjects: SubjectMeta[]; syllabus?: { id: string; subjectSlug: string; title: string; note: string | null } }) {
  const editing = !!syllabus;
  return (
    <FormDialog
      title={editing ? "Edit chapter list" : "New chapter list"}
      description="A chapter list belongs to one subject and can be shared by many courses (e.g. NCERT Class 10 Maths for CBSE, UP Board and Bihar Board)."
      submitLabel={editing ? "Save" : "Create"}
      confirm={(d) => ({
        title: editing ? "Save this chapter list?" : `Create “${String(d.get("title") ?? "").trim()}”?`,
        confirmLabel: editing ? "Save" : "Create",
      })}
      trigger={
        editing ? (
          <Button variant="outline" size="sm">
            <Pencil /> Edit details
          </Button>
        ) : (
          <Button>
            <Plus /> New chapter list
          </Button>
        )
      }
      action={saveSyllabusAction}
    >
      {editing && <input type="hidden" name="originalId" value={syllabus.id} />}
      <FieldWithError name="subjectSlug" label="Subject" hint={editing ? "Can't be changed." : undefined}>
        <select
          id="subjectSlug"
          name="subjectSlug"
          defaultValue={syllabus?.subjectSlug ?? ""}
          disabled={editing}
          className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm shadow-soft outline-none focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:opacity-60"
        >
          <option value="" disabled>
            Choose a subject
          </option>
          {subjects.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </FieldWithError>
      <FieldWithError name="title" label="Title">
        <Input id="title" name="title" defaultValue={syllabus?.title} placeholder="e.g. Maharashtra Board Class 10 · Science" />
      </FieldWithError>
      {!editing && (
        <FieldWithError name="id" label="ID (optional)" hint="Made from the title if left empty.">
          <Input id="id" name="id" placeholder="e.g. msbshse-10-science" autoComplete="off" />
        </FieldWithError>
      )}
      <FieldWithError name="note" label="Note (optional)" hint="Who uses this list — shown only to staff.">
        <Input id="note" name="note" defaultValue={syllabus?.note ?? ""} />
      </FieldWithError>
    </FormDialog>
  );
}
