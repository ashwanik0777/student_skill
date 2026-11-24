import "server-only";
import { aiStatus } from "@/lib/ai/model";
import { mapToSyllabus, questionKey, type OutsideQuestion } from "@/lib/ai/questions";
import { getCatalog } from "@/lib/catalog/server";
import { subjectName } from "@/lib/catalog/shared";
import { db } from "@/lib/db";
import { bankQuestions } from "@/lib/db/schema";
import { shuffle } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { ReviewError, queueForReview } from "./question-review";

/**
 * Open MCQ datasets with licences that allow reuse. Questions are fetched on demand (Hugging Face's public
 * dataset API or Open Trivia DB), matched to a chapter list by the AI, and parked in the review queue.
 */

type HfSource = { kind: "hf"; dataset: string; config: string; split: string; parse: (row: Record<string, unknown>) => OutsideQuestion | null };
type TriviaSource = { kind: "opentdb"; categories: number[] };

export type DatasetInfo = {
  id: string;
  name: string;
  licence: string;
  /** Subjects it suits; the dialog lists these chapter lists first. */
  subjects: string[];
  /** Needs HF_TOKEN in .env (gated dataset: accept its terms on huggingface.co first). */
  needsToken?: boolean;
  note?: string;
};

type Dataset = DatasetInfo & { source: HfSource | TriviaSource };

const LETTERS = ["A", "B", "C", "D", "E", "F"];
/** "A)21" → "21". Only letter labels with a bracket — never "2.5 m" or "1. 5" style numbers. */
const stripPrefix = (o: string) => o.replace(/^\s*\(?[A-Fa-f]\)\s*/, "").trim();

function fromArc(row: Record<string, unknown>): OutsideQuestion | null {
  const choices = row.choices as { text?: string[]; label?: string[] } | undefined;
  const text = String(row.question ?? "");
  const options = choices?.text ?? [];
  const labels = choices?.label ?? [];
  const correctIndex = labels.indexOf(String(row.answerKey ?? ""));
  return text && correctIndex >= 0 ? { text, options, correctIndex } : null;
}

function fromMmlu(row: Record<string, unknown>): OutsideQuestion | null {
  const options = Array.isArray(row.choices) ? row.choices.map(String) : [];
  const correctIndex = Number(row.answer);
  return row.question && Number.isInteger(correctIndex) ? { text: String(row.question), options, correctIndex } : null;
}

function fromAqua(row: Record<string, unknown>): OutsideQuestion | null {
  const options = Array.isArray(row.options) ? row.options.map((o) => stripPrefix(String(o))) : [];
  const correctIndex = LETTERS.indexOf(String(row.correct ?? "").trim().toUpperCase());
  return row.question && correctIndex >= 0 ? { text: String(row.question), options, correctIndex, hint: String(row.rationale ?? "") } : null;
}

/** MILU's columns aren't documented publicly (the dataset is gated), so accept the common shapes. */
function fromMilu(row: Record<string, unknown>): OutsideQuestion | null {
  const get = (...keys: string[]) => keys.map((k) => row[k]).find((v) => v !== undefined && v !== null && v !== "");
  const text = String(get("question", "Question") ?? "");
  let options: string[] = [];
  const list = get("options", "choices");
  if (Array.isArray(list)) options = list.map(String);
  else options = [1, 2, 3, 4].map((i) => get(`option${i}`, `option_${i}`, `Option${i}`, `option${String.fromCharCode(96 + i)}`)).filter((v) => v !== undefined).map(String);
  const target = String(get("target", "answer", "Answer", "correct_option") ?? "").trim();
  let correctIndex = -1;
  const m = target.match(/^option\s*_?(\d)$/i);
  if (m) correctIndex = Number(m[1]) - 1;
  else if (/^\d$/.test(target)) correctIndex = target === "0" ? 0 : Number(target) - 1; // "1"–"4" are 1-based
  else if (/^[A-Da-d]$/.test(target)) correctIndex = LETTERS.indexOf(target.toUpperCase());
  else correctIndex = options.findIndex((o) => o.trim().toLowerCase() === target.toLowerCase());
  return text && correctIndex >= 0 ? { text, options, correctIndex } : null;
}

const DATASETS: Dataset[] = [
  {
    id: "arc-easy",
    name: "ARC Easy — school science (AI2)",
    licence: "CC BY-SA 4.0",
    subjects: ["science", "physics", "chemistry", "biology", "geography"],
    source: { kind: "hf", dataset: "allenai/ai2_arc", config: "ARC-Easy", split: "train", parse: fromArc },
  },
  {
    id: "arc-challenge",
    name: "ARC Challenge — harder school science (AI2)",
    licence: "CC BY-SA 4.0",
    subjects: ["science", "physics", "chemistry", "biology", "geography"],
    source: { kind: "hf", dataset: "allenai/ai2_arc", config: "ARC-Challenge", split: "train", parse: fromArc },
  },
  ...(
    [
      ["physics", "high_school_physics", "Physics", ["physics", "science"]],
      ["chemistry", "high_school_chemistry", "Chemistry", ["chemistry", "science"]],
      ["biology", "high_school_biology", "Biology", ["biology", "science"]],
      ["maths", "high_school_mathematics", "Mathematics", ["maths"]],
      ["geography", "high_school_geography", "Geography", ["geography", "sst", "gk"]],
      ["economics", "high_school_macroeconomics", "Macroeconomics", ["economics"]],
      ["computer", "high_school_computer_science", "Computer science", ["computer"]],
    ] as const
  ).map(
    ([id, config, label, subjects]): Dataset => ({
      id: `mmlu-${id}`,
      name: `MMLU ${label} — high-school level`,
      licence: "MIT",
      subjects: [...subjects],
      note: "US high-school questions; many won't fit Indian chapters and are skipped.",
      source: { kind: "hf", dataset: "cais/mmlu", config, split: "test", parse: fromMmlu },
    }),
  ),
  {
    id: "aqua",
    name: "AQuA-RAT — quantitative aptitude (DeepMind)",
    licence: "Apache-2.0",
    subjects: ["maths", "general_test", "gk"],
    note: "Word problems with worked solutions; one wrong option is dropped to make four.",
    source: { kind: "hf", dataset: "deepmind/aqua_rat", config: "raw", split: "train", parse: fromAqua },
  },
  {
    id: "milu-en",
    name: "MILU — Indian competitive exams, English (AI4Bharat)",
    licence: "CC BY 4.0",
    subjects: ["gk", "general_test", "history", "geography", "polsci", "economics", "sst", "history_civics", "science"],
    needsToken: true,
    note: "From UPSC, SSC, state PSC and similar papers. Copyright of the original papers isn't settled — review carefully.",
    source: { kind: "hf", dataset: "ai4bharat/MILU", config: "English", split: "test", parse: fromMilu },
  },
  {
    id: "opentdb",
    name: "Open Trivia DB — science, geography, history",
    licence: "CC BY-SA 4.0",
    subjects: ["gk", "general_test"],
    note: "Community trivia, western-leaning.",
    source: { kind: "opentdb", categories: [9, 17, 22, 23] },
  },
];

export function listDatasets(): (DatasetInfo & { available: boolean })[] {
  const hasToken = Boolean(process.env.HF_TOKEN);
  return DATASETS.map((d) => ({
    id: d.id,
    name: d.name,
    licence: d.licence,
    subjects: d.subjects,
    needsToken: d.needsToken,
    note: d.note,
    available: !d.needsToken || hasToken,
  }));
}

/* ───────────────────────── Fetching ───────────────────────── */

const globalForDs = globalThis as unknown as { dsTotals?: Map<string, number> };
const totals = (globalForDs.dsTotals ??= new Map<string, number>());

async function hfRows(src: HfSource, offset: number, length: number) {
  const url = new URL("https://datasets-server.huggingface.co/rows");
  url.search = new URLSearchParams({ dataset: src.dataset, config: src.config, split: src.split, offset: String(offset), length: String(length) }).toString();
  const res = await fetch(url, {
    headers: process.env.HF_TOKEN ? { Authorization: `Bearer ${process.env.HF_TOKEN}` } : {},
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403 || res.status === 404) {
    throw new ReviewError("Hugging Face refused access. For gated datasets, accept the terms on huggingface.co and set HF_TOKEN in .env.");
  }
  if (!res.ok) throw new ReviewError(`Couldn't reach Hugging Face (HTTP ${res.status}). Try again in a minute.`);
  return (await res.json()) as { rows: { row: Record<string, unknown> }[]; num_rows_total: number };
}

async function fetchHf(src: HfSource, want: number): Promise<OutsideQuestion[]> {
  const key = `${src.dataset}/${src.config}/${src.split}`;
  let total = totals.get(key);
  if (total === undefined) {
    total = (await hfRows(src, 0, 1)).num_rows_total;
    totals.set(key, total);
  }
  const length = Math.min(100, want, total);
  const offset = Math.floor(Math.random() * Math.max(1, total - length + 1));
  const data = await hfRows(src, offset, length);
  return data.rows.map((r) => src.parse(r.row)).filter((q): q is OutsideQuestion => q !== null);
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", eacute: "é", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", hellip: "…", deg: "°", shy: "" };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITIES[e.toLowerCase()] ?? m),
  );

async function fetchTrivia(src: TriviaSource, want: number): Promise<OutsideQuestion[]> {
  const category = src.categories[Math.floor(Math.random() * src.categories.length)];
  const res = await fetch(`https://opentdb.com/api.php?amount=${Math.min(50, want)}&type=multiple&category=${category}`, { signal: AbortSignal.timeout(30_000), cache: "no-store" });
  if (!res.ok) throw new ReviewError(`Couldn't reach Open Trivia DB (HTTP ${res.status}).`);
  const data = (await res.json()) as { response_code: number; results: { question: string; correct_answer: string; incorrect_answers: string[] }[] };
  if (data.response_code === 5) throw new ReviewError("Open Trivia DB allows one request every 5 seconds. Try again shortly.");
  return (data.results ?? []).map((r) => ({ text: decode(r.question), options: [decode(r.correct_answer), ...r.incorrect_answers.map(decode)], correctIndex: 0 }));
}

/** Exactly four distinct options with the key kept; extra wrong options are dropped at random. */
function toFour(q: OutsideQuestion): OutsideQuestion | null {
  const options = q.options.map((o) => String(o).replace(/\s+/g, " ").trim());
  if (options.length < 4 || q.correctIndex < 0 || q.correctIndex >= options.length) return null;
  if (options.some((o) => !o) || new Set(options.map((o) => o.toLowerCase())).size !== options.length) return null;
  if (options.some((o) => /^(all|none|both) of (the )?(above|these)/i.test(o))) return null;
  const correct = options[q.correctIndex];
  const wrong = shuffle(options.filter((_, i) => i !== q.correctIndex)).slice(0, 3);
  const four = shuffle([correct, ...wrong]);
  const text = q.text.replace(/\s+\n/g, "\n").trim();
  if (text.length < 10 || text.length > 2000 || four.some((o) => o.length > 400)) return null;
  return { text, options: four, correctIndex: four.indexOf(correct), hint: q.hint };
}

/* ───────────────────────── Import ───────────────────────── */

export async function importFromDataset(opts: { datasetId: string; syllabusId: string; count: number; createdBy: string }) {
  const ds = DATASETS.find((d) => d.id === opts.datasetId);
  if (!ds) throw new ReviewError("Choose a dataset.");
  if (ds.needsToken && !process.env.HF_TOKEN) throw new ReviewError("This dataset needs HF_TOKEN in .env (accept its terms on huggingface.co first).");
  const status = aiStatus();
  if (!status.available) throw new ReviewError(status.reason ? `${status.reason}. The AI is needed to match questions to chapters.` : "AI is not available right now.");

  const cat = await getCatalog();
  const syllabus = cat.syllabi.find((s) => s.id === opts.syllabusId);
  if (!syllabus) throw new ReviewError("Choose a chapter list.");
  if (!syllabus.chapters.length) throw new ReviewError("This chapter list has no chapters yet.");
  const course =
    cat.courseConfigs.find((c) => c.active && c.subjects.some((s) => s.syllabusIds.includes(syllabus.id))) ??
    cat.courseConfigs.find((c) => c.subjects.some((s) => s.syllabusIds.includes(syllabus.id)));

  // Fetch roughly 3× what we want: many outside questions won't fit the chapter list.
  const want = Math.min(100, opts.count * 3);
  const raw = ds.source.kind === "hf" ? await fetchHf(ds.source, want) : await fetchTrivia(ds.source, want);
  const existing = await db.select({ text: bankQuestions.text }).from(bankQuestions).where(eq(bankQuestions.subjectSlug, syllabus.subjectSlug));
  const seen = new Set(existing.map((e) => questionKey(e.text)));
  const fresh: OutsideQuestion[] = [];
  for (const q of raw) {
    const four = toFour(q);
    if (!four) continue;
    const key = questionKey(four.text);
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(four);
  }
  if (!fresh.length) throw new ReviewError("No new usable questions in this sample. Try again — each run picks a different part of the dataset.");

  // Match to chapters in batches of 25 (in parallel — a few requests, well inside free-tier limits).
  const name = subjectName(cat, syllabus.subjectSlug);
  const ctx = { subjectName: name, audience: course?.audience ?? `students following “${syllabus.title}”`, chapters: syllabus.chapters.map((c) => c.name) };
  const batches: OutsideQuestion[][] = [];
  for (let i = 0; i < fresh.length; i += 25) batches.push(fresh.slice(i, i + 25));
  const mapped = (await Promise.all(batches.map((b) => mapToSyllabus(b, ctx)))).flat();

  const fit = fresh.flatMap((q, i) => {
    const m = mapped[i];
    return m ? [{ subject: syllabus.subjectSlug, syllabusId: syllabus.id, text: q.text, options: q.options, correctIndex: q.correctIndex, ...m }] : [];
  });
  if (!fit.length && !aiStatus().available) throw new ReviewError(`${aiStatus().reason ?? "AI stopped responding"}. Try again later.`);
  const chosen = fit.slice(0, opts.count);
  const { added } = await queueForReview(chosen, { source: "import", sourceNote: `${ds.name} · ${ds.licence}`, createdBy: opts.createdBy });
  return { added, looked: fresh.length, unmatched: fresh.length - fit.length, dataset: ds.name, syllabusTitle: syllabus.title, subjectName: name };
}
