"use client";

import { Check, GraduationCap, Rocket, School } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "@/lib/catalog/context";
import { optionsOf, resolveTrack, subjectName, type CourseSummary, type Track } from "@/lib/catalog/shared";
import { cn } from "@/lib/utils";

export type TrackDraft = {
  kind: "school" | "exam" | null;
  board: string | null;
  grade: number | null;
  stream: string | null;
  exam: string | null;
};

export type TrackLimits = {
  /** Only allow this goal. */
  kind?: "school" | "exam";
  /** Only allow these classes. */
  grades?: number[];
  /** Fixed board / stream. */
  board?: string;
  stream?: string;
};

export function draftFromTrack(t: Track | null): TrackDraft {
  if (!t) return { kind: null, board: null, grade: null, stream: null, exam: null };
  return t.kind === "school"
    ? { kind: "school", board: t.board, grade: t.grade, stream: t.stream, exam: null }
    : { kind: "exam", board: null, grade: null, stream: t.stream, exam: t.exam };
}

function OptionCard({
  selected,
  disabled,
  onClick,
  title,
  subtitle,
  icon,
  className,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex w-full items-start gap-3 rounded-2xl border bg-surface p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-45",
        selected ? "border-brand bg-brand-soft shadow-[0_0_0_3px_var(--brand-soft-border)]" : "border-border hover:border-border-strong",
        className,
      )}
    >
      {icon && (
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", selected ? "bg-brand text-white" : "bg-surface-2 text-muted-foreground")}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-semibold", selected && "text-brand-ink")}>{title}</span>
        {subtitle && <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{subtitle}</span>}
      </span>
      {selected && <Check className="absolute right-3 top-3 size-4 text-brand-ink" />}
    </button>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="flex items-center gap-2 text-sm font-semibold">
        <span className="grid size-6 place-items-center rounded-full bg-surface-3 text-xs tabular">{n}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

const uniq = <T,>(xs: T[]) => [...new Set(xs)];

function adjustDraft(d: TrackDraft, grades: number[], streamIds: string[], streamLocked: boolean): TrackDraft {
  let next = d;
  if (d.kind === "school") {
    if (grades.length === 1 && d.grade !== grades[0]) next = { ...next, grade: grades[0] };
    else if (d.grade !== null && grades.length > 0 && !grades.includes(d.grade)) next = { ...next, grade: null };
  }
  if (streamIds.length === 0 && next.stream !== null && !streamLocked) next = { ...next, stream: null };
  else if (streamIds.length === 1 && next.stream !== streamIds[0]) next = { ...next, stream: streamIds[0] };
  else if (streamIds.length > 1 && next.stream && !streamIds.includes(next.stream)) next = { ...next, stream: null };
  return next;
}

/**
 * Choose what to prepare for. Every option comes from the catalog (managed in /admin), so only combinations that
 * exist as active courses can be picked. Renders hidden inputs (kind, board, grade, stream, exam) for a <form>.
 */
export function TrackPicker({ initial, limits, onChange }: { initial?: TrackDraft; limits?: TrackLimits; onChange?: (track: Track | null) => void }) {
  const cat = useCatalog();
  const [draft, setDraft] = useState<TrackDraft>(() => {
    const base = initial ?? { kind: null, board: null, grade: null, stream: null, exam: null };
    return {
      ...base,
      kind: limits?.kind ?? base.kind,
      board: limits?.board ?? base.board,
      grade: limits?.grades?.length === 1 ? limits.grades[0] : base.grade,
      stream: limits?.stream ?? base.stream,
    };
  });

  const active = useMemo(() => cat.courses.filter((c) => c.active), [cat]);
  const school = useMemo(() => active.filter((c): c is CourseSummary & { track: Extract<Track, { kind: "school" }> } => c.track.kind === "school"), [active]);
  const exams = useMemo(() => active.filter((c): c is CourseSummary & { track: Extract<Track, { kind: "exam" }> } => c.track.kind === "exam"), [active]);

  const boards = optionsOf(cat, "board").filter((b) => school.some((c) => c.track.board === b.id));
  const examOptions = optionsOf(cat, "exam").filter((e) => exams.some((c) => c.track.exam === e.id));
  const gradesAll = uniq(school.filter((c) => !draft.board || c.track.board === draft.board).map((c) => c.track.grade)).sort((a, b) => a - b);
  const grades = limits?.grades ? gradesAll.filter((g) => limits.grades!.includes(g)) : gradesAll;
  const streamIdsForSchool = uniq(school.filter((c) => c.track.board === draft.board && c.track.grade === draft.grade && c.track.stream).map((c) => c.track.stream!));
  const streamIdsForExam = uniq(exams.filter((c) => c.track.exam === draft.exam && c.track.stream).map((c) => c.track.stream!));
  const streamIds = draft.kind === "exam" ? streamIdsForExam : streamIdsForSchool;
  const streams = optionsOf(cat, "stream").filter((s) => streamIds.includes(s.id));
  const showStream = streams.length > 0 && !limits?.stream;

  const course = useMemo(() => resolveTrack(cat, draft), [cat, draft]);
  const track = course?.track ?? null;
  useEffect(() => onChange?.(track), [track, onChange]);

  const set = (patch: Partial<TrackDraft>) => setDraft((d) => ({ ...d, ...patch }));

  // Keep the draft consistent with what the catalog offers: auto-pick a lone class/stream, drop choices that no
  // longer exist (e.g. after switching board), and clear the stream when the course doesn't have one.
  // Adjusted during render (React's "derive state from props" pattern) rather than in an effect.
  const optionsKey = `${grades.join(",")}|${streamIds.join(",")}|${limits?.stream ?? ""}`;
  const [seenOptionsKey, setSeenOptionsKey] = useState(optionsKey);
  if (optionsKey !== seenOptionsKey) {
    setSeenOptionsKey(optionsKey);
    const adjusted = adjustDraft(draft, grades, streamIds, !!limits?.stream);
    if (adjusted !== draft) setDraft(adjusted);
  }
  const subjects = course ? course.subjectSlugs.map((slug) => subjectName(cat, slug)) : [];
  let step = 1;

  return (
    <div className="space-y-7">
      {!limits?.kind && (
        <Step n={step++} title="What are you preparing for?">
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
            <OptionCard
              selected={draft.kind === "school"}
              onClick={() => set({ kind: "school", exam: null })}
              icon={<School className="size-5" />}
              title="School board exams"
              subtitle={boards.map((b) => b.name).join(", ")}
            />
            <OptionCard
              selected={draft.kind === "exam"}
              onClick={() => set({ kind: "exam", board: null, grade: null, stream: null })}
              icon={<Rocket className="size-5" />}
              title="Competitive exams"
              subtitle={examOptions.map((e) => e.short).join(", ")}
            />
          </div>
        </Step>
      )}

      {draft.kind === "school" && (
        <>
          {!limits?.board && (
            <Step n={step++} title="Your board">
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
                {boards.map((b) => (
                  <OptionCard
                    key={b.id}
                    selected={draft.board === b.id}
                    onClick={() => set({ board: b.id })}
                    title={b.name}
                    subtitle={[b.description, b.note].filter(Boolean).join(" · ")}
                  />
                ))}
              </div>
            </Step>
          )}
          {grades.length > 1 && (
            <Step n={step++} title="Your class">
              <div className="inline-flex w-full rounded-2xl border border-border bg-surface-2 p-1 sm:w-auto" role="radiogroup">
                {grades.map((g) => (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={draft.grade === g}
                    onClick={() => set({ grade: g })}
                    className={cn(
                      "flex-1 rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors sm:flex-none",
                      draft.grade === g ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Class {g}
                  </button>
                ))}
              </div>
            </Step>
          )}
        </>
      )}

      {draft.kind === "exam" && (
        <Step n={step++} title="Which exam?">
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
            {examOptions.map((e) => (
              <OptionCard
                key={e.id}
                selected={draft.exam === e.id}
                onClick={() => set({ exam: e.id })}
                icon={<GraduationCap className="size-5" />}
                title={e.name}
                subtitle={e.description}
              />
            ))}
          </div>
        </Step>
      )}

      {showStream && (
        <Step n={step++} title={draft.kind === "exam" ? "Your domain subjects" : "Your stream"}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup">
            {streams.map((s) => (
              <OptionCard key={s.id} selected={draft.stream === s.id} onClick={() => set({ stream: s.id })} title={s.name} subtitle={s.description} />
            ))}
          </div>
        </Step>
      )}

      {course && (
        <div className="rounded-2xl border border-success/25 bg-success-soft p-4 text-sm animate-fade-in">
          <p className="font-semibold text-success">{course.name}</p>
          <p className="mt-1 text-foreground">{subjects.join(" · ")}</p>
        </div>
      )}

      <input type="hidden" name="kind" value={draft.kind ?? ""} />
      <input type="hidden" name="board" value={draft.board ?? ""} />
      <input type="hidden" name="grade" value={draft.grade ?? ""} />
      <input type="hidden" name="stream" value={showStream || limits?.stream ? (draft.stream ?? "") : ""} />
      <input type="hidden" name="exam" value={draft.exam ?? ""} />
    </div>
  );
}
