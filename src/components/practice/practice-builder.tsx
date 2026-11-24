"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { SubjectIcon } from "@/components/subject-badge";
import { PreparingOverlay } from "@/components/tests/preparing-overlay";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { createPracticeAction } from "@/lib/actions/tests";
import { useCatalogLabels } from "@/lib/catalog/context";
import { cn } from "@/lib/utils";

const DIFFICULTIES = [
  { value: "adaptive", label: "Adaptive", hint: "Matches your level" },
  { value: "easy", label: "Easy", hint: "Build confidence" },
  { value: "medium", label: "Medium", hint: "Board standard" },
  { value: "hard", label: "Hard", hint: "HOTS & tricky" },
] as const;

const COUNTS = [5, 10, 15, 20];

export type PracticeSubject = { slug: string; chapters: { name: string; unit: string }[] };

export function PracticeBuilder({
  subjects,
  initialSubject,
  initialChapter,
}: {
  subjects: PracticeSubject[];
  initialSubject?: string;
  initialChapter?: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState<string>(initialSubject ?? subjects[0]?.slug ?? "");
  const [chapter, setChapter] = useState<string>(initialChapter ?? "");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]["value"]>("adaptive");
  const [count, setCount] = useState(10);
  const [timed, setTimed] = useState(true);
  const [pending, startTransition] = useTransition();
  const { subjectName } = useCatalogLabels();

  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of subjects.find((s) => s.slug === subject)?.chapters ?? []) map.set(c.unit, [...(map.get(c.unit) ?? []), c.name]);
    return [...map.entries()];
  }, [subject, subjects]);

  function generate() {
    startTransition(async () => {
      const r = await createPracticeAction({ subject, chapter: chapter || null, difficulty, count, timed });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      router.push(`/test/${r.data.testId}`);
    });
  }

  return (
    <div className="space-y-7">
      <Field label="Subject">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-5" role="radiogroup" aria-label="Subject">
          {subjects.map((s) => (

            <button
              key={s.slug}
              type="button"
              role="radio"
              aria-checked={subject === s.slug}
              onClick={() => {
                setSubject(s.slug);
                setChapter("");
              }}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-sm font-medium transition-all",
                subject === s.slug ? "border-brand bg-brand-soft shadow-[0_0_0_3px_var(--brand-soft-border)]" : "border-border bg-surface hover:border-border-strong",
              )}
            >
              <SubjectIcon subject={s.slug} />
              {subjectName(s.slug)}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Chapter" htmlFor="chapter" hint="Leave on ‘Mixed’ and we’ll pick the chapters you need most.">
        <Select id="chapter" value={chapter} onChange={(e) => setChapter(e.target.value)}>
          <option value="">Mixed — personalised for me</option>
          {groups.map(([branch, names]) => (
            <optgroup key={branch} label={branch}>
              {names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>

      <Field label="Difficulty">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Difficulty">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              role="radio"
              aria-checked={difficulty === d.value}
              onClick={() => setDifficulty(d.value)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-colors",
                difficulty === d.value ? "border-brand bg-brand-soft" : "border-border bg-surface hover:border-border-strong",
              )}
            >
              <span className={cn("block text-sm font-semibold", difficulty === d.value && "text-brand-ink")}>{d.label}</span>
              <span className="block text-xs text-muted-foreground">{d.hint}</span>
            </button>
          ))}
        </div>
      </Field>

      <div className="grid gap-7 sm:grid-cols-2">
        <Field label="Number of questions">
          <div className="inline-flex rounded-xl border border-border bg-surface-2 p-1" role="radiogroup" aria-label="Number of questions">
            {COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={count === n}
                onClick={() => setCount(n)}
                className={cn(
                  "min-w-12 rounded-lg px-3 py-1.5 text-sm font-semibold tabular transition-colors",
                  count === n ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Timer">
          <label className="flex cursor-pointer items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={timed}
              onClick={() => setTimed((t) => !t)}
              className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", timed ? "bg-brand" : "bg-surface-3")}
            >
              <span className={cn("absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform", timed ? "translate-x-5" : "translate-x-0")} />
            </button>
            <span className="text-sm text-muted-foreground">
              {timed ? `About ${Math.ceil((count * 75) / 60)} minutes` : "Untimed — focus on understanding"}
            </span>
          </label>
        </Field>
      </div>

      <Button size="lg" className="w-full sm:w-auto" onClick={generate} loading={pending}>
        {!pending && <Sparkles />} Generate practice test
      </Button>
      <PreparingOverlay open={pending} title="Creating your practice test" />
    </div>
  );
}
