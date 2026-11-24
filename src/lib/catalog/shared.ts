/**
 * Catalog types and pure helpers that are safe in both server and client code.
 * The data itself lives in the database (managed from /admin) and is loaded by `src/lib/catalog/server.ts`.
 */
import type { WeeklyConfig } from "@/lib/db/schema";

export type { WeeklyConfig, WeeklyPart } from "@/lib/db/schema";

export type Chapter = { name: string; unit: string };

export type Track =
  | { kind: "school"; board: string; grade: number; stream: string | null }
  | { kind: "exam"; exam: string; stream: string | null };

export type CatalogOption = {
  kind: "board" | "stream" | "exam";
  id: string;
  name: string;
  short: string;
  description: string | null;
  note: string | null;
  groupKey: string | null;
  needsStream: boolean;
  sort: number;
  active: boolean;
};

export type SubjectMeta = {
  slug: string;
  name: string;
  short: string;
  icon: string;
  tone: string;
  sort: number;
  active: boolean;
};

export type SyllabusInfo = { id: string; subjectSlug: string; title: string; note: string | null; sort: number; chapters: Chapter[] };

/** What a course teaches for one subject. */
export type CourseSubject = {
  slug: string;
  /** Resolved chapter list (union of the syllabi, in order, deduplicated by name). */
  chapters: Chapter[];
  syllabusIds: string[];
  borrowIds: string[];
  strict: boolean;
  sort: number;
};

export type CourseSummary = {
  key: string;
  track: Track;
  name: string;
  short: string;
  cohortKey: string;
  cohortLabel: string;
  active: boolean;
  sort: number;
  subjectSlugs: string[];
};

/** Everything the app needs to run a course (daily tests, weekly test, AI audience). */
export type CourseConfig = CourseSummary & {
  /** @deprecated kept for readability at old call sites: same as `name`. */
  label: string;
  cohort: { key: string; label: string };
  audience: string;
  isExam: boolean;
  subjects: CourseSubject[];
  daily: { questions: number; durationSec: number };
  weekly: WeeklyConfig & { questions: number };
};

/** Small enough to send to the browser once: names of boards/streams/exams, subject metadata, course summaries. */
export type CatalogLite = {
  options: CatalogOption[];
  subjects: SubjectMeta[];
  courses: CourseSummary[];
};

export type CatalogData = CatalogLite & {
  syllabi: SyllabusInfo[];
  courseConfigs: CourseConfig[];
};

/* ───────────────────────────── Pure helpers ───────────────────────────── */

export function trackKey(t: Track): string {
  return t.kind === "school" ? `${t.board}-${t.grade}${t.stream ? `-${t.stream}` : ""}` : `exam-${t.exam}${t.stream ? `-${t.stream}` : ""}`;
}

export function sameTrack(a: Track | null, b: Track | null) {
  return !!a && !!b && trackKey(a) === trackKey(b);
}

/** Reads the track stored on a user row (structure only — whether such a course exists is checked against the catalog). */
export function trackFromUser(u: { trackKind: string | null; board: string | null; grade: number | null; stream: string | null; exam: string | null }): Track | null {
  if (u.trackKind === "school" && u.board && u.grade) return { kind: "school", board: u.board, grade: u.grade, stream: u.stream };
  if (u.trackKind === "exam" && u.exam) return { kind: "exam", exam: u.exam, stream: u.stream };
  return null;
}

/** Builds a track from loose form input; returns null for an impossible shape. The catalog decides if it exists. */
export function trackFromRaw(raw: { kind?: unknown; board?: unknown; grade?: unknown; stream?: unknown; exam?: unknown }): Track | null {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  if (raw.kind === "school") {
    const board = str(raw.board);
    const grade = Number(raw.grade);
    if (!board || !Number.isInteger(grade) || grade <= 0) return null;
    return { kind: "school", board, grade, stream: str(raw.stream) };
  }
  if (raw.kind === "exam") {
    const exam = str(raw.exam);
    if (!exam) return null;
    return { kind: "exam", exam, stream: str(raw.stream) };
  }
  return null;
}

/** Columns to write on the user row for a course. */
export function trackColumns(c: CourseSummary) {
  const t = c.track;
  return t.kind === "school"
    ? { trackKind: "school" as const, board: t.board, grade: t.grade, stream: t.stream, exam: null, cohort: c.cohortKey }
    : { trackKind: "exam" as const, board: null, grade: null, stream: t.stream, exam: t.exam, cohort: c.cohortKey };
}

/* ───────────────────────────── Lookups over the lite catalog ───────────────────────────── */

export function optionsOf(cat: CatalogLite, kind: CatalogOption["kind"], includeInactive = false) {
  return cat.options.filter((o) => o.kind === kind && (includeInactive || o.active)).sort((a, b) => a.sort - b.sort);
}

export function optionName(cat: CatalogLite, kind: CatalogOption["kind"], id: string | null | undefined, field: "name" | "short" = "name") {
  if (!id) return "";
  return cat.options.find((o) => o.kind === kind && o.id === id)?.[field] ?? id;
}

export function subjectOf(cat: CatalogLite, slug: string) {
  return cat.subjects.find((s) => s.slug === slug);
}

export function subjectName(cat: CatalogLite, slug: string) {
  return subjectOf(cat, slug)?.name ?? (slug === "mixed" ? "Mixed" : slug);
}

export function courseByKey(cat: CatalogLite, key: string | null | undefined) {
  return key ? cat.courses.find((c) => c.key === key) : undefined;
}

export function courseForTrack(cat: CatalogLite, t: Track | null) {
  return t ? courseByKey(cat, trackKey(t)) : undefined;
}

/** Validates loose input against the catalog: only an existing course counts. */
export function resolveTrack(cat: CatalogLite, raw: Parameters<typeof trackFromRaw>[0], opts: { includeInactive?: boolean } = {}) {
  const t = trackFromRaw(raw);
  const c = courseForTrack(cat, t);
  return c && (opts.includeInactive || c.active) ? c : null;
}

/** Readable course name, falling back to the stored key for courses that no longer exist. */
export function courseLabelFromKey(cat: CatalogLite, key: string | null | undefined) {
  if (!key) return "—";
  return courseByKey(cat, key)?.name ?? key;
}

export function cohortLabelFromKey(cat: CatalogLite, key: string | null | undefined) {
  if (!key) return "All students";
  return cat.courses.find((c) => c.cohortKey === key)?.cohortLabel ?? "All students";
}

/** Every cohort in course order (admin filters, announcement audiences). */
export function listCohorts(cat: CatalogLite) {
  const seen = new Map<string, string>();
  for (const c of [...cat.courses].sort((a, b) => a.sort - b.sort)) if (!seen.has(c.cohortKey)) seen.set(c.cohortKey, c.cohortLabel);
  return [...seen.entries()].map(([key, label]) => ({ key, label }));
}

/** Short names for "Done with Class 10? Move up to Class 11" style copy. */
export function nextStepLabel(cat: CatalogLite, t: Track): string | null {
  if (t.kind !== "school") return null;
  const higher = cat.courses.filter((c) => c.active && c.track.kind === "school" && c.track.board === t.board && c.track.grade === t.grade + 1);
  if (higher.length) return `Class ${t.grade + 1}`;
  return cat.courses.some((c) => c.active && c.track.kind === "exam") ? "competitive exam prep" : null;
}
