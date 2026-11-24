"use client";

import { Bot, Check, CircleAlert, CircleCheck, Database, FileInput, Pencil, ShieldCheck, Sparkles, Trash2, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton, confirmAndRun } from "@/components/ui/confirm";
import { Select } from "@/components/ui/input";
import { deleteRejectedAction, generateQuestionsAction, importDatasetAction, recheckQuestionsAction, reviewQuestionsAction } from "@/lib/actions/catalog";
import type { ReviewRow } from "@/lib/admin/catalog-queries";
import type { DatasetInfo } from "@/lib/services/dataset-import";
import { useCatalog } from "@/lib/catalog/context";
import { subjectName, type SyllabusInfo } from "@/lib/catalog/shared";
import { cn, timeAgo } from "@/lib/utils";
import { FieldWithError, FormDialog } from "./form-dialog";

type Row = Omit<ReviewRow, "total">;
type State = "pending" | "rejected";

const DIFFICULTY_TONE = { easy: "success", medium: "brand", hard: "warning" } as const;
const LETTER = ["A", "B", "C", "D"];
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ───────────────────────── List with bulk actions ───────────────────────── */

export function ReviewList({ rows, state, syllabusTitles, aiReady }: { rows: Row[]; state: State; syllabusTitles: Record<string, string>; aiReady: boolean }) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  // Rows that left the page after an action drop out of the selection automatically.
  const selected = useMemo(() => rows.filter((r) => picked.has(r.id)).map((r) => r.id), [rows, picked]);
  const agreed = useMemo(() => rows.filter((r) => r.aiCheck?.agrees).map((r) => r.id), [rows]);
  const unchecked = useMemo(() => rows.filter((r) => !r.aiCheck).map((r) => r.id), [rows]);
  const all = selected.length === rows.length && rows.length > 0;

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulk = (ids: string[], confirm: Parameters<typeof confirmAndRun>[0], run: (ids: string[]) => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    startTransition(async () => {
      const result = await confirmAndRun(confirm, () => run(ids));
      if (result?.ok) setPicked(new Set());
    });

  const n = selected.length;
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface px-3.5 py-2.5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          <label className="flex cursor-pointer items-center gap-2 font-medium">
            <input
              type="checkbox"
              className="size-4 accent-brand"
              checked={all}
              onChange={() => setPicked(all ? new Set() : new Set(rows.map((r) => r.id)))}
              aria-label="Select every question on this page"
            />
            {n ? `${n} selected` : "Select all"}
          </label>
          {state === "pending" && agreed.length > 0 && (
            <button type="button" onClick={() => setPicked(new Set(agreed))} className="text-[13px] font-medium text-brand-ink hover:underline">
              Select the {agreed.length} the AI check agrees with
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {state === "pending" ? (
            <>
              {aiReady && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending || !(n ? selected : unchecked).length}
                  onClick={() => {
                    const ids = (n ? selected : unchecked).slice(0, 20);
                    bulk(
                      ids,
                      {
                        title: `Double-check ${plural(ids.length, "answer")} with AI?`,
                        description: "A second AI pass answers each question without seeing the key, and flags any it disagrees with.",
                        confirmLabel: "Check",
                      },
                      (x) => recheckQuestionsAction(x),
                    );
                  }}
                >
                  <ShieldCheck /> {n ? "Double-check" : unchecked.length ? `Double-check ${Math.min(unchecked.length, 20)} unchecked` : "All checked"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-danger hover:bg-danger-soft"
                disabled={pending || !n}
                onClick={() =>
                  bulk(
                    selected,
                    { title: `Reject ${plural(n, "question")}?`, description: "They won't be used in tests. You can still approve them later from the Rejected tab.", confirmLabel: "Reject", tone: "danger" },
                    (x) => reviewQuestionsAction(x, "reject"),
                  )
                }
              >
                <X /> Reject
              </Button>
              <Button
                size="sm"
                disabled={pending || !n}
                onClick={() =>
                  bulk(
                    selected,
                    { title: `Approve ${plural(n, "question")}?`, description: "They join the question bank and can be picked for tests straight away.", confirmLabel: "Approve" },
                    (x) => reviewQuestionsAction(x, "approve"),
                  )
                }
              >
                <Check /> Approve{n ? ` ${n}` : ""}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-danger hover:bg-danger-soft"
                disabled={pending || !n}
                onClick={() =>
                  bulk(
                    selected,
                    { title: `Delete ${plural(n, "question")} for good?`, description: "This can't be undone.", confirmLabel: "Delete", tone: "danger" },
                    (x) => deleteRejectedAction(x),
                  )
                }
              >
                <Trash2 /> Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending || !n}
                onClick={() =>
                  bulk(selected, { title: `Send ${plural(n, "question")} back to review?`, confirmLabel: "Send back" }, (x) => reviewQuestionsAction(x, "requeue"))
                }
              >
                <Undo2 /> Back to review
              </Button>
              <Button
                size="sm"
                disabled={pending || !n}
                onClick={() =>
                  bulk(
                    selected,
                    { title: `Approve ${plural(n, "question")}?`, description: "They join the question bank and can be picked for tests straight away.", confirmLabel: "Approve" },
                    (x) => reviewQuestionsAction(x, "approve"),
                  )
                }
              >
                <Check /> Approve{n ? ` ${n}` : ""}
              </Button>
            </>
          )}
        </div>
      </div>

      <ul className="space-y-3">
        {rows.map((r) => (
          <ReviewCard key={r.id} row={r} state={state} selected={picked.has(r.id)} onToggle={() => toggle(r.id)} syllabusTitle={syllabusTitles[r.syllabusId] ?? r.syllabusId} />
        ))}
      </ul>
    </div>
  );
}

/* ───────────────────────── One question ───────────────────────── */

function ReviewCard({ row: r, state, selected, onToggle, syllabusTitle }: { row: Row; state: State; selected: boolean; onToggle: () => void; syllabusTitle: string }) {
  const cat = useCatalog();
  const check = r.aiCheck;
  const disagrees = check && !check.agrees;
  return (
    <li className={cn("rounded-2xl border bg-surface shadow-soft transition-colors", selected ? "border-brand" : "border-border")}>
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <input type="checkbox" checked={selected} onChange={onToggle} className="mt-1 size-4 shrink-0 accent-brand" aria-label="Select this question" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <Badge tone={DIFFICULTY_TONE[r.difficulty]}>{r.difficulty}</Badge>
            <Badge tone="outline">
              {r.source === "ai" ? <Bot aria-hidden /> : <FileInput aria-hidden />}
              {r.source === "ai" ? "AI" : r.source === "import" ? "Imported" : "Staff"}
            </Badge>
            <span className="font-medium text-foreground">{subjectName(cat, r.subjectSlug)}</span>·<span>{r.chapter}</span>·<span>{r.topic}</span>
            <span className="hidden md:inline">· {syllabusTitle}</span>
          </p>

          <p className="mt-3 whitespace-pre-line text-[15px] font-medium leading-relaxed">{r.text}</p>

          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {r.options.map((o, i) => {
              const correct = i === r.correctIndex;
              const aiPick = disagrees && check.picked === i;
              return (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl border px-3 py-2 text-sm",
                    correct ? "border-success/40 bg-success-soft" : aiPick ? "border-warning/50 bg-warning-soft" : "border-border",
                  )}
                >
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-md text-[11px] font-semibold", correct ? "bg-success text-white" : "bg-surface-2 text-muted-foreground")}>
                    {LETTER[i]}
                  </span>
                  <span className="min-w-0 flex-1 break-words">{o}</span>
                  {correct && <span className="shrink-0 text-[11px] font-semibold text-success">Answer</span>}
                  {aiPick && <span className="shrink-0 text-[11px] font-semibold text-warning">AI&apos;s pick</span>}
                </li>
              );
            })}
          </ol>

          <div className="mt-3 rounded-xl bg-surface-2/70 px-3.5 py-2.5 text-[13px] leading-relaxed">
            <span className="font-semibold">Explanation · </span>
            <span className="text-muted-foreground">{r.explanation}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
            {!check ? (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <ShieldCheck className="size-4" aria-hidden /> Not double-checked yet
              </span>
            ) : check.agrees ? (
              <span className="inline-flex items-center gap-1.5 text-success">
                <CircleCheck className="size-4" aria-hidden /> AI double-check agrees with the answer
              </span>
            ) : (
              <span className="inline-flex items-start gap-1.5 text-warning">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  {check.picked === -1
                    ? "AI double-check thinks no option is correct."
                    : check.picked !== r.correctIndex
                      ? `AI double-check picked ${LETTER[check.picked]} — verify the key.`
                      : "AI double-check agrees with the key but flagged it."}
                  {check.note && <span className="text-muted-foreground"> “{check.note}”</span>}
                </span>
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {r.sourceNote ? `${r.sourceNote} · ` : ""}
              {timeAgo(r.createdAt)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-2.5 sm:px-5">
        <Link href={`/admin/questions/${r.id}`} className="mr-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground">
          <Pencil className="size-3.5" /> Edit
        </Link>
        {state === "pending" ? (
          <ConfirmButton
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger-soft"
            confirm={{ title: "Reject this question?", description: "It won't be used in tests. You can still approve it later from the Rejected tab.", confirmLabel: "Reject", tone: "danger" }}
            run={() => reviewQuestionsAction([r.id], "reject")}
          >
            <X /> Reject
          </ConfirmButton>
        ) : (
          <ConfirmButton variant="ghost" size="sm" confirm={{ title: "Send this question back to review?", confirmLabel: "Send back" }} run={() => reviewQuestionsAction([r.id], "requeue")}>
            <Undo2 /> Back to review
          </ConfirmButton>
        )}
        <ConfirmButton
          size="sm"
          variant="soft"
          confirm={{ title: "Approve this question?", description: "It joins the question bank and can be picked for tests straight away.", confirmLabel: "Approve" }}
          run={() => reviewQuestionsAction([r.id], "approve")}
        >
          <Check /> Approve
        </ConfirmButton>
      </div>
    </li>
  );
}

/* ───────────────────────── Edit page: decide after editing ───────────────────────── */

export function ReviewDecision({ id, state }: { id: string; state: State }) {
  const router = useRouter();
  const back = () => router.push("/admin/review");
  return (
    <div className="flex flex-wrap items-center gap-2">
      {state === "pending" ? (
        <ConfirmButton
          variant="outline"
          size="sm"
          className="text-danger hover:bg-danger-soft"
          confirm={{ title: "Reject this question?", description: "It won't be used in tests.", confirmLabel: "Reject", tone: "danger" }}
          run={() => reviewQuestionsAction([id], "reject")}
          onSuccess={back}
        >
          <X /> Reject
        </ConfirmButton>
      ) : (
        <ConfirmButton variant="outline" size="sm" confirm={{ title: "Send this question back to review?", confirmLabel: "Send back" }} run={() => reviewQuestionsAction([id], "requeue")} onSuccess={back}>
          <Undo2 /> Back to review
        </ConfirmButton>
      )}
      <ConfirmButton
        size="sm"
        confirm={{ title: "Approve this question?", description: "Save your edits first — approval uses the saved version.", confirmLabel: "Approve" }}
        run={() => reviewQuestionsAction([id], "approve")}
        onSuccess={back}
      >
        <Check /> Approve
      </ConfirmButton>
    </div>
  );
}

/* ───────────────────────── Generate with AI ───────────────────────── */

export function GenerateQuestionsDialog({ syllabi, initialSyllabus, disabledReason }: { syllabi: SyllabusInfo[]; initialSyllabus?: string; disabledReason?: string | null }) {
  const cat = useCatalog();
  if (disabledReason) {
    return (
      <Button disabled title={disabledReason}>
        <Sparkles /> Generate with AI
      </Button>
    );
  }
  return (
    <FormDialog
      title="Generate questions with AI"
      description="New questions wait in the review queue — nothing reaches students until you approve it. Takes about half a minute."
      submitLabel="Generate"
      className="max-w-lg"
      trigger={
        <Button>
          <Sparkles /> Generate with AI
        </Button>
      }
      action={generateQuestionsAction}
      confirm={(d) => {
        const list = syllabi.find((s) => s.id === d.get("syllabusId"));
        if (!list) return null;
        const chapter = String(d.get("chapter") ?? "");
        return {
          title: `Generate ${d.get("count")} questions with AI?`,
          description: `${subjectName(cat, list.subjectSlug)} — ${list.title} · ${chapter || "chapters with the fewest questions"}. Each answer is double-checked by a second AI pass.`,
          confirmLabel: "Generate",
        };
      }}
    >
      <GenerateFields syllabi={syllabi} initialSyllabus={initialSyllabus} />
    </FormDialog>
  );
}

function GenerateFields({ syllabi, initialSyllabus }: { syllabi: SyllabusInfo[]; initialSyllabus?: string }) {
  const cat = useCatalog();
  const [syllabusId, setSyllabusId] = useState(initialSyllabus ?? "");
  const chapters = syllabi.find((s) => s.id === syllabusId)?.chapters ?? [];
  return (
    <>
      <FieldWithError name="syllabusId" label="Chapter list">
        <Select name="syllabusId" value={syllabusId} onChange={(e) => setSyllabusId(e.target.value)}>
          <option value="" disabled>
            Choose
          </option>
          {cat.subjects.map((s) => {
            const own = syllabi.filter((x) => x.subjectSlug === s.slug);
            if (!own.length) return null;
            return (
              <optgroup key={s.slug} label={s.name}>
                {own.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </Select>
      </FieldWithError>
      <FieldWithError name="chapter" label="Chapter">
        <Select name="chapter" defaultValue="" key={syllabusId} disabled={!syllabusId}>
          <option value="">Chapters with the fewest questions</option>
          {chapters.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </Select>
      </FieldWithError>
      <div className="grid grid-cols-2 gap-3">
        <FieldWithError name="count" label="Questions">
          <Select name="count" defaultValue="10">
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </FieldWithError>
        <FieldWithError name="difficulty" label="Difficulty">
          <Select name="difficulty" defaultValue="adaptive">
            <option value="adaptive">Exam mix</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
        </FieldWithError>
      </div>
    </>
  );
}

/* ───────────────────────── Import from an open dataset ───────────────────────── */

type DatasetOption = DatasetInfo & { available: boolean };
type ListOption = Pick<SyllabusInfo, "id" | "subjectSlug" | "title">;

export function DatasetImportDialog({ datasets, syllabi, disabledReason }: { datasets: DatasetOption[]; syllabi: ListOption[]; disabledReason?: string | null }) {
  const cat = useCatalog();
  const trigger = (
    <Button variant="outline" disabled={!!disabledReason} title={disabledReason ?? undefined}>
      <Database /> Import from dataset
    </Button>
  );
  if (disabledReason) return trigger;
  return (
    <FormDialog
      title="Import from an open dataset"
      description="A random sample is fetched, the AI matches each question to a chapter and writes an explanation, and everything waits here for your review. Takes up to a minute."
      submitLabel="Import"
      className="max-w-lg"
      trigger={trigger}
      action={importDatasetAction}
      confirm={(d) => {
        const ds = datasets.find((x) => x.id === d.get("datasetId"));
        const list = syllabi.find((s) => s.id === d.get("syllabusId"));
        if (!ds || !list) return null;
        return {
          title: `Import up to ${d.get("count")} questions?`,
          description: `From ${ds.name} (${ds.licence}) into ${subjectName(cat, list.subjectSlug)} — ${list.title}.`,
          confirmLabel: "Import",
        };
      }}
    >
      <DatasetFields datasets={datasets} syllabi={syllabi} />
    </FormDialog>
  );
}

function DatasetFields({ datasets, syllabi }: { datasets: DatasetOption[]; syllabi: ListOption[] }) {
  const cat = useCatalog();
  const [datasetId, setDatasetId] = useState(datasets.find((d) => d.available)?.id ?? "");
  const ds = datasets.find((d) => d.id === datasetId);
  const suits = new Set(ds?.subjects ?? []);
  const label = (s: ListOption) => `${subjectName(cat, s.subjectSlug)} — ${s.title}`;
  const suggested = syllabi.filter((s) => suits.has(s.subjectSlug));
  const others = syllabi.filter((s) => !suits.has(s.subjectSlug));
  return (
    <>
      <FieldWithError
        name="datasetId"
        label="Dataset"
        hint={ds ? `Licence: ${ds.licence}.${ds.note ? ` ${ds.note}` : ""}` : undefined}
      >
        <Select name="datasetId" value={datasetId} onChange={(e) => setDatasetId(e.target.value)}>
          {datasets.map((d) => (
            <option key={d.id} value={d.id} disabled={!d.available}>
              {d.name}
              {d.available ? "" : " — needs HF_TOKEN"}
            </option>
          ))}
        </Select>
      </FieldWithError>
      <FieldWithError name="syllabusId" label="Chapter list">
        <Select name="syllabusId" defaultValue="" key={datasetId}>
          <option value="" disabled>
            Choose
          </option>
          {suggested.length > 0 && (
            <optgroup label="Suits this dataset">
              {suggested.map((s) => (
                <option key={s.id} value={s.id}>
                  {label(s)}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label={suggested.length ? "Other chapter lists" : "Chapter lists"}>
            {others.map((s) => (
              <option key={s.id} value={s.id}>
                {label(s)}
              </option>
            ))}
          </optgroup>
        </Select>
      </FieldWithError>
      <FieldWithError name="count" label="Questions (at most)">
        <Select name="count" defaultValue="20">
          {[10, 20, 30].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
      </FieldWithError>
    </>
  );
}
