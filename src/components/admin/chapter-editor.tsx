"use client";

import { ArrowDown, ArrowUp, Check, ClipboardPaste, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmToast, type ConfirmOptions } from "@/components/ui/confirm";
import { Input, Textarea } from "@/components/ui/input";
import { addChapterAction, deleteChapterAction, deleteSyllabusAction, importChaptersAction, moveChapterAction, updateChapterAction } from "@/lib/actions/catalog";
import { ActionDialog } from "./action-dialog";
import { ActionForm, FieldWithError, FormDialog } from "./form-dialog";

export type ChapterItem = { id: string; name: string; unit: string; questions: number };

function Row({ chapter, first, last }: { chapter: ChapterItem; first: boolean; last: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(chapter.name);
  const [unit, setUnit] = useState(chapter.unit);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, confirm?: ConfirmOptions) =>
    start(async () => {
      if (confirm && !(await confirmToast(confirm))) return;
      const r = await fn();
      if (r.ok) {
        if (r.message) toast.success(r.message);
        setEditing(false);
      } else toast.error(r.error);
    });

  if (editing) {
    return (
      <li className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center">
        <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Edit chapter name" className="h-10 sm:flex-1" />
        <Input value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Edit unit" placeholder="Unit" className="h-10 sm:w-48" />
        <div className="flex gap-1">
          <Button size="sm" loading={pending} onClick={() => run(() => updateChapterAction(chapter.id, { name, unit }), { title: "Save this chapter?", description: `${name.trim()} · ${unit.trim() || "no unit"}`, confirmLabel: "Save" })}>
            {!pending && <Check />} Save chapter
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            <X /> Cancel
          </Button>
        </div>
      </li>
    );
  }
  return (
    <li className="group flex items-center gap-2 py-2.5">
      <div className="flex flex-col">
        <button type="button" aria-label="Move up" disabled={first || pending} onClick={() => run(() => moveChapterAction(chapter.id, "up"))} className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-30">
          <ArrowUp className="size-3.5" />
        </button>
        <button type="button" aria-label="Move down" disabled={last || pending} onClick={() => run(() => moveChapterAction(chapter.id, "down"))} className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-30">
          <ArrowDown className="size-3.5" />
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{chapter.name}</p>
        <p className="text-xs text-muted-foreground">
          {chapter.unit} · {chapter.questions} {chapter.questions === 1 ? "question" : "questions"}
        </p>
      </div>
      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${chapter.name}`} onClick={() => setEditing(true)}>
        <Pencil />
      </Button>
      <ActionDialog
        trigger={
          <Button variant="ghost" size="icon-sm" className="text-danger hover:bg-danger-soft" aria-label={`Remove ${chapter.name}`}>
            <Trash2 />
          </Button>
        }
        title={`Remove “${chapter.name}”?`}
        description={chapter.questions ? `${chapter.questions} bank question(s) are tagged with this chapter; they'll stay but won't be used until a chapter with this name exists again.` : "It disappears from every course that uses this list."}
        confirmLabel="Remove chapter"
        tone="danger"
        run={() => deleteChapterAction(chapter.id)}
      />
    </li>
  );
}

export function ChapterEditor({ syllabusId, chapters }: { syllabusId: string; chapters: ChapterItem[] }) {
  const units = [...new Set(chapters.map((c) => c.unit))];
  return (
    <div className="space-y-5">
      {chapters.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong px-4 py-8 text-center text-sm text-muted-foreground">No chapters yet — add them below or paste a list.</p>
      ) : (
        <ul className="divide-y divide-border">
          {chapters.map((c, i) => (
            <Row key={c.id} chapter={c} first={i === 0} last={i === chapters.length - 1} />
          ))}
        </ul>
      )}
      <div className="rounded-xl border border-border bg-surface-2/60 p-4">
        <p className="mb-3 text-sm font-semibold">Add a chapter</p>
        <ActionForm action={addChapterAction} submitLabel="Add" resetOnSuccess className="space-y-3" confirm={(d) => ({ title: `Add “${String(d.get("name") ?? "").trim()}” to this list?`, confirmLabel: "Add" })}>
          <input type="hidden" name="syllabusId" value={syllabusId} />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <FieldWithError name="name" label="Chapter name">
              <Input id="name" name="name" placeholder="e.g. Quadratic Equations" />
            </FieldWithError>
            <FieldWithError name="unit" label="Unit / section">
              <Input id="unit" name="unit" list={`units-${syllabusId}`} placeholder="e.g. Algebra" />
              <datalist id={`units-${syllabusId}`}>
                {units.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </FieldWithError>
          </div>
        </ActionForm>
      </div>
    </div>
  );
}

export function ImportChaptersDialog({ syllabusId }: { syllabusId: string }) {
  return (
    <FormDialog
      title="Paste a chapter list"
      description={
        <>
          One chapter per line. Put the unit first with a bar to group chapters: <code className="rounded bg-surface-2 px-1">Algebra | Polynomials</code>
        </>
      }
      submitLabel="Add chapters"
      className="max-w-lg"
      confirm={(d) => {
        const lines = String(d.get("text") ?? "").split("\n").filter((l) => l.trim()).length;
        return { title: `Add ${lines} chapter${lines === 1 ? "" : "s"} to this list?`, description: "Chapters that already exist are skipped.", confirmLabel: "Add chapters" };
      }}
      trigger={
        <Button variant="outline" size="sm">
          <ClipboardPaste /> Paste list
        </Button>
      }
      action={importChaptersAction}
    >
      <input type="hidden" name="syllabusId" value={syllabusId} />
      <FieldWithError name="unit" label="Default unit" hint="Used for lines without a unit.">
        <Input id="unit" name="unit" placeholder="General" />
      </FieldWithError>
      <FieldWithError name="text" label="Chapters">
        <Textarea id="text" name="text" className="min-h-48 font-mono text-[13px]" placeholder={"Number Systems | Real Numbers\nAlgebra | Polynomials\nAlgebra | Quadratic Equations"} />
      </FieldWithError>
    </FormDialog>
  );
}

export function DeleteSyllabusButton({ id, title, questions, usedBy }: { id: string; title: string; questions: number; usedBy: number }) {
  const router = useRouter();
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" className="text-danger hover:bg-danger-soft">
          <Trash2 /> Delete list
        </Button>
      }
      title={`Delete “${title}”?`}
      description={usedBy ? `${usedBy} course subject(s) still use this list — remove it from them first.` : `This also deletes its ${questions} bank question(s). It can't be undone.`}
      confirmLabel="Delete chapter list"
      tone="danger"
      confirmText={questions ? { label: "Type DELETE to confirm", expected: "DELETE" } : undefined}
      run={() => deleteSyllabusAction(id)}
      onSuccess={() => router.replace("/admin/syllabus")}
    />
  );
}

export { Plus };
