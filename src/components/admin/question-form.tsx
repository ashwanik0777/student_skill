"use client";

import { Eye, EyeOff, FileJson, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm";
import { Input, Select, Textarea } from "@/components/ui/input";
import { deleteQuestionAction, importQuestionsAction, saveQuestionAction, setQuestionActiveAction } from "@/lib/actions/catalog";
import { useCatalog } from "@/lib/catalog/context";
import { subjectName, type SyllabusInfo } from "@/lib/catalog/shared";
import type { BankQuestionRow } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { ActionDialog } from "./action-dialog";
import { ActionForm, Check, FieldWithError, FormDialog, useFieldError } from "./form-dialog";

const SOURCE_LABEL = { seed: "from the starter bank", admin: "added by staff", ai: "written by AI", import: "imported from an outside source" } as const;

function OptionInputs({ defaults, defaultCorrect }: { defaults: string[]; defaultCorrect: number }) {
  const [correct, setCorrect] = useState(defaultCorrect);
  const error = useFieldError("options");
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">Options — tick the correct one</legend>
      <input type="hidden" name="correctIndex" value={correct} />
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <label key={i} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors", correct === i ? "border-success bg-success-soft" : "border-border")}>
            <input type="radio" name="correctPick" checked={correct === i} onChange={() => setCorrect(i)} className="size-4 accent-emerald-600" aria-label={`Option ${i + 1} is correct`} />
            <Input name={`option${i}`} defaultValue={defaults[i] ?? ""} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="h-10 border-0 bg-transparent px-0 shadow-none focus:ring-0" />
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </fieldset>
  );
}

export function QuestionForm({ syllabi, question, initialSyllabus }: { syllabi: SyllabusInfo[]; question?: BankQuestionRow; initialSyllabus?: string }) {
  const cat = useCatalog();
  const [syllabusId, setSyllabusId] = useState(question?.syllabusId ?? initialSyllabus ?? "");
  const chapters = useMemo(() => syllabi.find((s) => s.id === syllabusId)?.chapters ?? [], [syllabi, syllabusId]);
  const grouped = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const c of chapters) m.set(c.unit, [...(m.get(c.unit) ?? []), c.name]);
    return [...m.entries()];
  }, [chapters]);

  return (
    <ActionForm
      action={saveQuestionAction}
      submitLabel={question ? "Save question" : "Add question"}
      className="space-y-5"
      confirm={question ? { title: "Save changes to this question?", description: "Future tests use the new version; past results keep the old one.", confirmLabel: "Save" } : { title: "Add this question to the bank?", description: "It can be picked for tests straight away.", confirmLabel: "Add" }}
    >
      {question && <input type="hidden" name="id" value={question.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldWithError name="syllabusId" label="Chapter list">
          <Select id="syllabusId" name="syllabusId" value={syllabusId} onChange={(e) => setSyllabusId(e.target.value)}>
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
          <Select id="chapter" name="chapter" defaultValue={question?.chapter ?? ""} key={syllabusId} disabled={!syllabusId}>
            <option value="" disabled>
              {syllabusId ? "Choose a chapter" : "Choose a chapter list first"}
            </option>
            {grouped.map(([unit, names]) => (
              <optgroup key={unit} label={unit}>
                {names.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </FieldWithError>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <FieldWithError name="topic" label="Topic" hint="2–5 words, e.g. “Nature of roots”. Shown in results and weak-area analysis.">
          <Input id="topic" name="topic" defaultValue={question?.topic} />
        </FieldWithError>
        <FieldWithError name="difficulty" label="Difficulty">
          <Select id="difficulty" name="difficulty" defaultValue={question?.difficulty ?? "medium"}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
        </FieldWithError>
      </div>
      <FieldWithError name="text" label="Question">
        <Textarea id="text" name="text" defaultValue={question?.text} className="min-h-28" />
      </FieldWithError>
      <OptionInputs defaults={question?.options ?? []} defaultCorrect={question?.correctIndex ?? 0} />
      <FieldWithError name="explanation" label="Explanation" hint="Shown to students after the test — teach the concept, don't just restate the answer.">
        <Textarea id="explanation" name="explanation" defaultValue={question?.explanation} className="min-h-24" />
      </FieldWithError>
      <Check name="active" label="Use in tests" defaultChecked={question?.active ?? true} />
      {question && (
        <p className="text-xs text-muted-foreground">
          {subjectName(cat, question.subjectSlug)} · ID <span className="font-mono">{question.id}</span> · {SOURCE_LABEL[question.source]}
        </p>
      )}
    </ActionForm>
  );
}

export function QuestionRowActions({ id, active }: { id: string; active: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <ConfirmButton
        variant="ghost"
        size="icon-sm"
        aria-label={active ? "Hide from tests" : "Use in tests"}
        title={active ? "Hide from tests" : "Use in tests"}
        confirm={
          active
            ? { title: "Hide this question from tests?", description: "It stays in the bank but won’t be picked for new tests.", confirmLabel: "Hide", tone: "danger" }
            : { title: "Use this question in tests again?", confirmLabel: "Use in tests" }
        }
        run={() => setQuestionActiveAction(id, !active)}
      >
        {active ? <EyeOff /> : <Eye />}
      </ConfirmButton>
      <DeleteQuestionButton id={id} />
    </div>
  );
}

export function DeleteQuestionButton({ id, afterDelete }: { id: string; afterDelete?: string }) {
  const router = useRouter();
  return (
    <ActionDialog
      trigger={
        <Button variant="ghost" size="icon-sm" className="text-danger hover:bg-danger-soft" aria-label="Delete question">
          <Trash2 />
        </Button>
      }
      title="Delete this question?"
      description="Tests that already used it keep their copy; it just won't be picked again."
      confirmLabel="Delete"
      tone="danger"
      run={() => deleteQuestionAction(id)}
      onSuccess={() => (afterDelete ? router.replace(afterDelete) : router.refresh())}
    />
  );
}

const EXAMPLE = `[
  {
    "chapter": "Quadratic Equations",
    "topic": "Nature of roots",
    "text": "For which value of k does x² + kx + 9 = 0 have equal roots?",
    "options": ["3", "6", "9", "±6"],
    "correctIndex": 3,
    "explanation": "Equal roots need b² − 4ac = 0 → k² − 36 = 0 → k = ±6.",
    "difficulty": "medium"
  }
]`;

/** Only the list itself is needed here — no chapters — so the question bank page stays light. */
export function ImportQuestionsDialog({ syllabi, initialSyllabus }: { syllabi: Pick<SyllabusInfo, "id" | "subjectSlug" | "title">[]; initialSyllabus?: string }) {
  const cat = useCatalog();
  return (
    <FormDialog
      title="Import questions (JSON)"
      description="Paste an array of questions for one chapter list. Chapter names must match the list exactly; options are shuffled when shown to students."
      submitLabel="Import"
      className="max-w-2xl"
      confirm={(d) => {
        const list = syllabi.find((s) => s.id === d.get("syllabusId"));
        let count: number | null = null;
        try {
          const parsed: unknown = JSON.parse(String(d.get("json") ?? ""));
          if (Array.isArray(parsed)) count = parsed.length;
        } catch {}
        // Invalid input goes straight to the server, which explains what's wrong.
        if (!list || count === null) return null;
        const review = d.get("review") === "on";
        return {
          title: `Import ${count} question${count === 1 ? "" : "s"}?`,
          description: `Into ${subjectName(cat, list.subjectSlug)} — ${list.title}. ${review ? "They wait in the review queue until approved." : "They can be picked for tests straight away."}`,
          confirmLabel: "Import",
        };
      }}
      trigger={
        <Button variant="outline">
          <FileJson /> Import JSON
        </Button>
      }
      action={importQuestionsAction}
    >
      <FieldWithError name="syllabusId" label="Chapter list">
        <Select id="syllabusId" name="syllabusId" defaultValue={initialSyllabus ?? ""}>
          <option value="" disabled>
            Choose
          </option>
          {syllabi.map((s) => (
            <option key={s.id} value={s.id}>
              {subjectName(cat, s.subjectSlug)} — {s.title}
            </option>
          ))}
        </Select>
      </FieldWithError>
      <FieldWithError name="json" label="Questions (JSON array)">
        <Textarea id="json" name="json" className="min-h-64 font-mono text-[12px]" placeholder={EXAMPLE} spellCheck={false} />
      </FieldWithError>
      <FieldWithError name="sourceNote" label="Source (optional)" hint="Book, website or dataset and its licence — shown to reviewers.">
        <Input name="sourceNote" maxLength={200} placeholder="e.g. Teacher's notes, or a dataset name and licence" />
      </FieldWithError>
      <Check name="review" label="Send to the review queue first" hint="Recommended for anything not written by your teachers. Duplicates are skipped." defaultChecked />
    </FormDialog>
  );
}
