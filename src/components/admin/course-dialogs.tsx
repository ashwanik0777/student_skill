"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  createCourseAction,
  deleteCourseAction,
  moveCourseSubjectAction,
  removeCourseSubjectAction,
  saveCourseSubjectAction,
  saveWeeklyPartsAction,
  setCourseActiveAction,
} from "@/lib/actions/catalog";
import { useCatalog } from "@/lib/catalog/context";
import { optionsOf, subjectName, type CourseSubject, type SubjectMeta, type SyllabusInfo, type WeeklyPart } from "@/lib/catalog/shared";
import { cn } from "@/lib/utils";
import { ConfirmButton } from "@/components/ui/confirm";
import { ActionDialog } from "./action-dialog";
import { Check, FieldWithError, FormDialog } from "./form-dialog";

/* ───────────────────────────── Create course ───────────────────────────── */

export function CreateCourseDialog() {
  const cat = useCatalog();
  const [kind, setKind] = useState<"school" | "exam">("school");
  const [exam, setExam] = useState("");
  const boards = optionsOf(cat, "board", true);
  const streams = optionsOf(cat, "stream", true);
  const exams = optionsOf(cat, "exam", true);
  const examNeedsStream = exams.find((e) => e.id === exam)?.needsStream ?? false;
  return (
    <FormDialog
      title="Add a course"
      description="A course is a board + class (+ stream) or a competitive exam (+ stream). You can copy subjects from an existing course to start quickly."
      submitLabel="Create course"
      className="max-w-lg"
      confirm={{ title: "Create this course?", description: "It starts switched off — add subjects, then switch it on.", confirmLabel: "Create" }}
      trigger={
        <Button>
          <Plus /> Add course
        </Button>
      }
      action={createCourseAction}
    >
      <input type="hidden" name="kind" value={kind} />
      <div className="grid grid-cols-2 rounded-xl border border-border bg-surface-2 p-1" role="radiogroup" aria-label="Kind">
        {(
          [
            ["school", "School board"],
            ["exam", "Competitive exam"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={kind === value}
            onClick={() => setKind(value)}
            className={cn("h-9 rounded-lg text-sm font-medium transition-colors", kind === value ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}
          >
            {label}
          </button>
        ))}
      </div>
      {kind === "school" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <FieldWithError name="board" label="Board">
            <Select id="board" name="board" defaultValue="">
              <option value="" disabled>
                Choose
              </option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </FieldWithError>
          <FieldWithError name="grade" label="Class">
            <Input id="grade" name="grade" type="number" min={1} max={14} placeholder="10" />
          </FieldWithError>
          <FieldWithError name="stream" label="Stream (optional)">
            <Select id="stream" name="stream" defaultValue="">
              <option value="">None (e.g. Class 10)</option>
              {streams.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FieldWithError>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldWithError name="exam" label="Exam">
            <Select id="exam" name="exam" value={exam} onChange={(e) => setExam(e.target.value)}>
              <option value="" disabled>
                Choose
              </option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </FieldWithError>
          <FieldWithError name="stream" label={examNeedsStream ? "Stream (domain)" : "Stream (optional)"}>
            <Select id="stream" name="stream" defaultValue="">
              <option value="">None</option>
              {streams.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FieldWithError>
        </div>
      )}
      <FieldWithError name="copyFrom" label="Copy subjects from (optional)" hint="Copies subjects, chapter lists and the Sunday test mix. Everything stays editable.">
        <Select id="copyFrom" name="copyFrom" defaultValue="">
          <option value="">Start empty</option>
          {cat.courses.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </Select>
      </FieldWithError>
      <p className="text-[13px] text-muted-foreground">New courses start switched off. Add subjects, then switch it on so students can pick it.</p>
    </FormDialog>
  );
}

/* ───────────────────────────── Course row actions ───────────────────────────── */

export function CourseActiveToggle({ courseKey, name, active, disabled }: { courseKey: string; name?: string; active: boolean; disabled?: boolean }) {
  const label = name ? `“${name}”` : "this course";
  return (
    <ConfirmButton
      variant={active ? "soft" : "outline"}
      size="sm"
      disabled={disabled}
      title={disabled ? "Add a subject first" : active ? "Hide from new sign-ups" : "Make available to students"}
      confirm={
        active
          ? { title: `Switch off ${label}?`, description: "New students can’t pick it. Students already in it keep their tests.", confirmLabel: "Switch off", tone: "danger" }
          : { title: `Switch on ${label}?`, description: "Students can pick it at sign-up and in course settings.", confirmLabel: "Switch on" }
      }
      run={() => setCourseActiveAction(courseKey, !active)}
    >
      <Power /> {active ? "On" : "Off"}
    </ConfirmButton>
  );
}

export function DeleteCourseButton({ courseKey, name, students }: { courseKey: string; name: string; students: number }) {
  const router = useRouter();
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" className="text-danger hover:bg-danger-soft">
          <Trash2 /> Delete course
        </Button>
      }
      title={`Delete “${name}”?`}
      description={students ? `${students} student(s) are in this course, so it can't be deleted. Switch it off instead.` : "Its subjects list and Sunday test mix are removed. Chapter lists and questions are kept."}
      confirmLabel="Delete course"
      tone="danger"
      run={() => deleteCourseAction(courseKey)}
      onSuccess={() => router.replace("/admin/courses")}
    />
  );
}

/* ───────────────────────────── Course subjects ───────────────────────────── */

type CourseSubjectRow = { id: string; slug: string; syllabusIds: string[]; borrowIds: string[]; strict: boolean };

function SyllabusPicker({ name, label, hint, syllabi, selected, onChange }: { name: string; label: string; hint?: string; syllabi: SyllabusInfo[]; selected: string[]; onChange: (ids: string[]) => void }) {
  return (
    <FieldWithError name={name} label={label} hint={hint}>
      {syllabi.length === 0 ? (
        <p className="text-sm text-muted-foreground">No chapter lists for this subject yet. Create one under Subjects & chapters.</p>
      ) : (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border bg-background p-2 scrollbar-thin">
          {syllabi.map((s) => {
            const checked = selected.includes(s.id);
            return (
              <label key={s.id} className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2", checked && "bg-brand-soft/60")}>
                <input
                  type="checkbox"
                  name={name}
                  value={s.id}
                  checked={checked}
                  onChange={(e) => onChange(e.target.checked ? [...selected, s.id] : selected.filter((x) => x !== s.id))}
                  className="size-4 accent-brand"
                />
                <span className="min-w-0 flex-1 truncate">{s.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular">{s.chapters.length} ch</span>
              </label>
            );
          })}
        </div>
      )}
    </FieldWithError>
  );
}

export function CourseSubjectDialog({
  courseKey,
  subjects,
  syllabi,
  existingSlugs,
  row,
}: {
  courseKey: string;
  subjects: SubjectMeta[];
  syllabi: SyllabusInfo[];
  existingSlugs: string[];
  row?: CourseSubjectRow;
}) {
  const editing = !!row;
  const [subject, setSubject] = useState(row?.slug ?? "");
  const [syllabusIds, setSyllabusIds] = useState<string[]>(row?.syllabusIds ?? []);
  const [borrowIds, setBorrowIds] = useState<string[]>(row?.borrowIds ?? []);
  const forSubject = useMemo(() => syllabi.filter((s) => s.subjectSlug === subject), [syllabi, subject]);
  const available = editing ? subjects : subjects.filter((s) => !existingSlugs.includes(s.slug));
  return (
    <FormDialog
      title={editing ? `Edit ${subjects.find((s) => s.slug === row.slug)?.name ?? row.slug}` : "Add a subject to this course"}
      description="Chapters come from the chapter lists you tick. Questions come from those lists plus any extra pools you allow."
      submitLabel={editing ? "Save" : "Add subject"}
      className="max-w-lg"
      confirm={editing ? { title: "Save these subject settings?", confirmLabel: "Save" } : { title: "Add this subject to the course?", description: "Students in this course start getting daily tests for it.", confirmLabel: "Add" }}
      trigger={
        editing ? (
          <Button variant="ghost" size="icon-sm" aria-label="Edit subject settings">
            <Pencil />
          </Button>
        ) : (
          <Button size="sm">
            <Plus /> Add subject
          </Button>
        )
      }
      action={saveCourseSubjectAction}
    >
      <input type="hidden" name="courseKey" value={courseKey} />
      {editing && <input type="hidden" name="id" value={row.id} />}
      {editing && <input type="hidden" name="subjectSlug" value={row.slug} />}
      {!editing && (
        <FieldWithError name="subjectSlug" label="Subject">
          <Select
            id="subjectSlug"
            name="subjectSlug"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setSyllabusIds([]);
              setBorrowIds([]);
            }}
          >
            <option value="" disabled>
              Choose a subject
            </option>
            {available.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </Select>
        </FieldWithError>
      )}
      {subject && (
        <>
          <SyllabusPicker name="syllabusIds" label="Chapter lists" hint="Tick two to combine them (e.g. Class 11 + Class 12 for an entrance exam)." syllabi={forSubject} selected={syllabusIds} onChange={setSyllabusIds} />
          <SyllabusPicker
            name="borrowIds"
            label="Also use questions from"
            hint="Extra pools whose questions may be used when a chapter name matches (or as a fallback for non-language subjects)."
            syllabi={forSubject.filter((s) => !syllabusIds.includes(s.id))}
            selected={borrowIds}
            onChange={setBorrowIds}
          />
          <Check name="strict" label="Only use questions from matching chapters" hint="Recommended for languages, where chapters are specific texts." defaultChecked={row?.strict ?? ["english", "hindi"].includes(subject)} />
        </>
      )}
    </FormDialog>
  );
}

export function CourseSubjectRowActions({ row, first, last, name }: { row: CourseSubjectRow; first: boolean; last: boolean; name: string }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.message);
      else toast.error(r.error);
    });
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Move up" disabled={first || pending} onClick={() => run(() => moveCourseSubjectAction(row.id, "up"))} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-30">
        <ArrowUp className="size-4" />
      </button>
      <button type="button" aria-label="Move down" disabled={last || pending} onClick={() => run(() => moveCourseSubjectAction(row.id, "down"))} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-30">
        <ArrowDown className="size-4" />
      </button>
      <ActionDialog
        trigger={
          <Button variant="ghost" size="icon-sm" className="text-danger hover:bg-danger-soft" aria-label={`Remove ${name}`}>
            <Trash2 />
          </Button>
        }
        title={`Remove ${name} from this course?`}
        description="Students in this course stop getting daily tests for it. Past results are kept."
        confirmLabel="Remove"
        tone="danger"
        run={() => removeCourseSubjectAction(row.id)}
      />
    </div>
  );
}

/* ───────────────────────────── Sunday test mix ───────────────────────────── */

export function WeeklyPartsEditor({ courseKey, parts: initial, subjects }: { courseKey: string; parts: WeeklyPart[]; subjects: CourseSubject[] }) {
  const cat = useCatalog();
  const [parts, setParts] = useState<WeeklyPart[]>(initial);
  const total = parts.reduce((n, p) => n + (Number(p.count) || 0), 0);
  const unitsFor = (slug: string) => [...new Set(subjects.find((s) => s.slug === slug)?.chapters.map((c) => c.unit) ?? [])];
  const update = (i: number, patch: Partial<WeeklyPart>) => setParts((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-3">
      {parts.map((p, i) => {
        const units = unitsFor(p.subject);
        return (
          <div key={i} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)_auto] sm:items-center">
            <Select value={p.subject} onChange={(e) => update(i, { subject: e.target.value, units: undefined })} aria-label="Subject">
              {subjects.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {subjectName(cat, s.slug)}
                </option>
              ))}
            </Select>
            <Input type="number" min={1} max={50} value={p.count} onChange={(e) => update(i, { count: Number(e.target.value) })} aria-label="Questions" />
            <Select
              value={p.units?.[0] ?? ""}
              onChange={(e) => update(i, { units: e.target.value ? [e.target.value] : undefined })}
              aria-label="Limit to unit"
              disabled={units.length <= 1}
            >
              <option value="">All units</option>
              {units.map((u) => (
                <option key={u} value={u}>
                  Only {u}
                </option>
              ))}
            </Select>
            <Button variant="ghost" size="icon-sm" aria-label="Remove part" onClick={() => setParts((ps) => ps.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" disabled={subjects.length === 0} onClick={() => setParts((ps) => [...ps, { subject: subjects[0]?.slug ?? "", count: 5 }])}>
          <Plus /> Add part
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground tabular">{total} questions in total</span>
          <ConfirmButton
            size="sm"
            confirm={{ title: "Save the Sunday test mix?", description: `${total} questions in ${parts.length} part${parts.length === 1 ? "" : "s"} — used from the next Sunday test.`, confirmLabel: "Save" }}
            run={() => saveWeeklyPartsAction(courseKey, parts)}
          >
            Save mix
          </ConfirmButton>
        </div>
      </div>
    </div>
  );
}
