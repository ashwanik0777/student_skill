import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { Difficulty, QuestionWithAnswer } from "@/lib/types";
import { shuffle } from "@/lib/utils";
import { BASE_INSTRUCTIONS, CHECK_MODEL_LABEL, MODEL_LABEL, aiAvailable, model, reportAiFailure, type Lane } from "./model";

const questionSchema = z.object({
  chapter: z.string().describe("Exact chapter name from the provided list"),
  topic: z.string().describe("Specific sub-topic, 2–5 words"),
  text: z.string().describe("The question stem"),
  options: z.array(z.string()).describe("Exactly four answer options, without A/B/C/D prefixes"),
  correctIndex: z.number().int().describe("0-based index of the correct option"),
  explanation: z.string().describe("2–3 sentence explanation that teaches the concept"),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const batchSchema = z.object({ questions: z.array(questionSchema) });

export type GenerateRequest = {
  /** Subject slug, e.g. "physics". */
  subject: string;
  subjectName: string;
  /** Who the questions are for, e.g. "CBSE (NCERT books) Class 12 Science (PCM) students". */
  audience: string;
  /** Competitive-exam style (JEE/NEET/CUET/NDA) instead of board style. */
  isExam: boolean;
  count: number;
  /** Chapters to focus on (names from the syllabus). */
  chapters: string[];
  /** Every valid chapter name for this subject — answers outside it are mapped back. */
  syllabus: string[];
  difficulty: Difficulty | "adaptive";
  weakTopics?: string[];
  /** Stems of questions that already exist — the model is asked not to repeat them. */
  avoid?: string[];
};

/** Rough identity of a question for de-duplication: lower-case stem, spacing and punctuation ignored. */
export function questionKey(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, 90);
}

function difficultyLine(d: GenerateRequest["difficulty"]) {
  switch (d) {
    case "easy":
      return "Mostly easy, recall and direct-application questions.";
    case "medium":
      return "Mostly medium difficulty: application and two-step reasoning, a couple of easy ones.";
    case "hard":
      return "Mostly hard: multi-step reasoning, HOTS and competency-based questions, a couple of medium ones.";
    default:
      return "A realistic exam mix: about 30% easy, 50% medium, 20% hard. Weak topics should start easier and build up.";
  }
}

function subjectStyle(subject: string) {
  switch (subject) {
    case "maths":
      return "Use plain Unicode maths (x², √3, π, θ, ≤, ×, ÷, ½, ∫, Σ) — never LaTeX. Include numerical problems with exact answers.";
    case "physics":
      return "Mix conceptual and numerical questions with SI units; keep numbers clean so the answer is exact.";
    case "chemistry":
      return "Write formulae and reactions in Unicode (H₂SO₄, CH₃COOH, →, ⇌). Mix physical, inorganic and organic questions where relevant.";
    case "biology":
      return "Cover concepts, processes and NCERT-line facts; describe diagrams in words.";
    case "science":
      return "Mix physics numericals, balanced chemical equations (Unicode subscripts) and biology concepts.";
    case "sst":
    case "history":
    case "polsci":
    case "geography":
    case "history_civics":
      return "Include chronology, cause–effect, map-reading (described in words) and source/case-based questions.";
    case "accountancy":
      return "Use ₹ amounts; journal entries, ratios and statements must balance exactly.";
    case "business":
      return "Use short case-based situations and concept-identification questions.";
    case "economics":
      return "Mix concept questions with simple numericals (national income, elasticity, central tendency…); describe graphs in words.";
    case "english":
      return "Use literature questions about characters, themes and events from the named chapters/poems, plus grammar and verbal-ability items.";
    case "hindi":
      return "पूरा प्रश्न, सभी विकल्प और व्याख्या शुद्ध हिंदी (देवनागरी) में लिखें। पाठ, लेखक/कवि, भाव, काव्य सौंदर्य और व्याकरण पर आधारित प्रश्न बनाएँ।";
    case "computer":
      return "Use short Java code snippets (ICSE style); outputs and answers must be exactly right.";
    case "general_test":
      return "Mix static general knowledge, numerical ability, quantitative and logical reasoning. Avoid current affairs that can go out of date.";
    case "gk":
      return "Cover physics, chemistry, general science, Indian history and freedom movement, and geography. Avoid dated current affairs.";
    default:
      return "";
  }
}

function normalise(raw: z.infer<typeof questionSchema>, req: GenerateRequest): QuestionWithAnswer | null {
  const options = raw.options.map((o) => o.replace(/^\s*(\(?[A-Da-d][).:]|[A-Da-d]\s*-)\s+/, "").trim()).filter(Boolean);
  if (options.length !== 4) return null;
  if (new Set(options.map((o) => o.toLowerCase())).size !== 4) return null;
  if (!Number.isInteger(raw.correctIndex) || raw.correctIndex < 0 || raw.correctIndex > 3) return null;
  if (!raw.text.trim() || !raw.explanation.trim()) return null;
  const chapter =
    req.syllabus.find((c) => c.toLowerCase() === raw.chapter.trim().toLowerCase()) ?? req.chapters[0] ?? req.syllabus[0];

  // Shuffle options so the answer key isn't biased toward one position.
  const correctText = options[raw.correctIndex];
  const shuffled = shuffle(options);
  return {
    subject: req.subject,
    chapter,
    topic: raw.topic.trim().slice(0, 80) || chapter,
    text: raw.text.trim(),
    options: shuffled,
    correctIndex: shuffled.indexOf(correctText),
    explanation: raw.explanation.trim(),
    difficulty: raw.difficulty,
  };
}

/**
 * Generates a validated batch of MCQs. Returns as many valid questions as it could (possibly fewer than requested);
 * callers top up from the question bank.
 */
export async function generateQuestions(req: GenerateRequest): Promise<QuestionWithAnswer[]> {
  if (!aiAvailable() || req.count <= 0) return [];
  const ask = Math.min(req.count + 2, 32); // a couple extra in case some fail validation

  const prompt = [
    `Create ${ask} multiple-choice questions on ${req.subjectName} for ${req.audience}.`,
    req.isExam
      ? "Match the style, depth and difficulty of the real exam's previous-year questions (single correct answer)."
      : "Match the board's exam pattern and the prescribed textbooks.",
    `Chapters to use (spread questions across them, use these exact names in "chapter"): ${req.chapters.join(" | ")}.`,
    `Difficulty: ${difficultyLine(req.difficulty)}`,
    req.weakTopics?.length
      ? `The student is weak in: ${req.weakTopics.join(", ")}. Include several questions that target these, with explanations that fix the misconception.`
      : "",
    subjectStyle(req.subject),
    `Rules: exactly 4 options each, exactly one correct; options similar in length and plausible; never use "All of the above", "None of the above" or refer to other options by letter; no trick wording; each question must be self-contained.`,
    req.avoid?.length
      ? `These questions already exist — do not repeat them or ask the same thing in other words:\n${req.avoid.map((t) => `- ${t.slice(0, 140)}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { output } = await generateText({
      model: model(),
      instructions: BASE_INSTRUCTIONS,
      prompt,
      output: Output.object({ schema: batchSchema }),
      reasoning: "low",
      abortSignal: AbortSignal.timeout(90_000),
      maxRetries: 1,
    });
    const seen = new Set((req.avoid ?? []).map(questionKey));
    const result: QuestionWithAnswer[] = [];
    for (const raw of output.questions) {
      const q = normalise(raw, req);
      if (!q) continue;
      const key = questionKey(q.text);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(q);
      if (result.length >= req.count) break;
    }
    return result;
  } catch (error) {
    reportAiFailure(error);
    return [];
  }
}

/* ───────────────────────── Answer double-check ───────────────────────── */

const checkSchema = z.object({
  answers: z.array(
    z.object({
      n: z.number().int().describe("Question number as given"),
      picked: z.number().int().describe("0-based index of the option you believe is correct, or -1 if none is correct"),
      note: z.string().describe("Empty if the question is fine; otherwise one short sentence on what is wrong or ambiguous"),
    }),
  ),
});

export type CheckInput = { text: string; options: string[]; correctIndex: number; subjectName: string };
export type CheckResult = { picked: number; agrees: boolean; note?: string; model: string; at: string };

/**
 * Solves each question independently (the answer key is not shown) so reviewers can see where the AI disagrees
 * with the stored key. Returns null for questions it couldn't check.
 */
export async function checkAnswers(items: CheckInput[]): Promise<(CheckResult | null)[]> {
  if (items.length === 0) return [];
  const prompt = [
    "Solve each multiple-choice question below on your own. Work carefully; for numericals compute the answer exactly.",
    "For each, return the 0-based index of the correct option (-1 if no option is correct), and a short note only if the question is wrong, ambiguous, has two correct options or is outside school/exam level.",
    "",
    ...items.map((q, i) => [`Q${i + 1} (${q.subjectName}). ${q.text}`, ...q.options.map((o, j) => `  ${j}) ${o}`)].join("\n")),
  ].join("\n");
  // Prefer the dedicated checking model; if it is paused (its free quota is small), fall back to the main one.
  const lanes: Lane[] = (["check", "main"] as const).filter((l) => aiAvailable(l));
  for (const lane of lanes) {
    try {
      const { output } = await generateText({
        model: model(lane),
        instructions: BASE_INSTRUCTIONS,
        prompt,
        output: Output.object({ schema: checkSchema }),
        reasoning: "medium",
        abortSignal: AbortSignal.timeout(120_000),
        maxRetries: 1,
      });
      const at = new Date().toISOString();
      const label = lane === "check" ? CHECK_MODEL_LABEL : MODEL_LABEL;
      const byN = new Map(output.answers.map((a) => [a.n, a]));
      return items.map((q, i) => {
        const a = byN.get(i + 1);
        if (!a || !Number.isInteger(a.picked) || a.picked < -1 || a.picked > 3) return null;
        const note = a.note.trim();
        return { picked: a.picked, agrees: a.picked === q.correctIndex && !note, note: note || undefined, model: label, at };
      });
    } catch (error) {
      reportAiFailure(error, lane);
    }
  }
  return items.map(() => null);
}

/* ───────────────────────── Matching outside questions to a syllabus ───────────────────────── */

const mapSchema = z.object({
  items: z.array(
    z.object({
      n: z.number().int().describe("Question number as given"),
      chapter: z.string().describe('Exact chapter name from the list, or "none" if no chapter fits'),
      topic: z.string().describe("Specific sub-topic, 2–5 words"),
      difficulty: z.enum(["easy", "medium", "hard"]),
      explanation: z.string().describe("2–3 sentence explanation of why the marked answer is right"),
      suitable: z
        .boolean()
        .describe("false if it needs a figure/table that isn't given, is specific to the USA/Europe, is doubtful or ambiguous, or doesn't fit these students"),
    }),
  ),
});

export type OutsideQuestion = { text: string; options: string[]; correctIndex: number; hint?: string };
export type MappedQuestion = { chapter: string; topic: string; difficulty: Difficulty; explanation: string };

/**
 * For questions taken from an open dataset: picks the chapter each one belongs to (or none), and writes the topic,
 * difficulty and a student-facing explanation. The answer key itself comes from the dataset.
 */
export async function mapToSyllabus(
  items: OutsideQuestion[],
  ctx: { subjectName: string; audience: string; chapters: string[] },
): Promise<(MappedQuestion | null)[]> {
  if (!aiAvailable() || items.length === 0) return items.map(() => null);
  const prompt = [
    `These multiple-choice questions come from an open dataset. Decide which chapter of the ${ctx.subjectName} syllabus for ${ctx.audience} each one belongs to.`,
    `Chapters (use these exact names): ${ctx.chapters.join(" | ")}.`,
    'Use "none" when no chapter is a good fit. Mark suitable=false for anything that needs a missing figure, is about the USA/Europe specifically, is ambiguous, or is far above or below this level.',
    "Write the explanation for an Indian student, in the language of the question.",
    "",
    ...items.map((q, i) =>
      [`Q${i + 1}. ${q.text}`, ...q.options.map((o, j) => `  ${j}) ${o}${j === q.correctIndex ? "   ← correct" : ""}`), q.hint ? `  Worked solution: ${q.hint.slice(0, 600)}` : ""]
        .filter(Boolean)
        .join("\n"),
    ),
  ].join("\n");
  try {
    const { output } = await generateText({
      model: model(),
      instructions: BASE_INSTRUCTIONS,
      prompt,
      output: Output.object({ schema: mapSchema }),
      reasoning: "low",
      abortSignal: AbortSignal.timeout(120_000),
      maxRetries: 1,
    });
    const names = new Map(ctx.chapters.map((c) => [c.toLowerCase(), c]));
    const byN = new Map(output.items.map((a) => [a.n, a]));
    return items.map((_, i) => {
      const a = byN.get(i + 1);
      const chapter = a && names.get(a.chapter.trim().toLowerCase());
      if (!a || !a.suitable || !chapter || !a.explanation.trim()) return null;
      return { chapter, topic: a.topic.trim().slice(0, 80) || chapter, difficulty: a.difficulty, explanation: a.explanation.trim() };
    });
  } catch (error) {
    reportAiFailure(error);
    return items.map(() => null);
  }
}
