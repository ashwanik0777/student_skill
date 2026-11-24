import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { AttemptFeedback, InsightsReport, StudyPlanReport } from "@/lib/db/schema";
import { BASE_INSTRUCTIONS, aiAvailable, model, reportAiFailure } from "./model";

const COACH = `${BASE_INSTRUCTIONS}
You are now acting as a warm, practical study coach. Speak directly to the student ("you"), be specific to the data, and keep every item short and actionable. Never invent scores or data that weren't provided.`;

/* ───────────────────────── Attempt feedback ───────────────────────── */

const feedbackSchema = z.object({
  summary: z.string().describe("2 sentences on how the test went"),
  strengths: z.array(z.string()).describe("1–3 things the student did well"),
  focusAreas: z
    .array(z.object({ topic: z.string(), why: z.string(), tip: z.string() }))
    .describe("Up to 3 topics to fix, each with why and a concrete tip"),
  nextSteps: z.array(z.string()).describe("2–3 next actions"),
});

export type FeedbackInput = {
  subjectName: string;
  /** e.g. "CBSE (NCERT books) Class 12 Science (PCM) students" */
  audience: string;
  score: number;
  correct: number;
  wrong: number;
  skipped: number;
  timeTakenSec: number;
  durationSec: number;
  mistakes: { topic: string; chapter: string; question: string; chosen: string | null; correct: string }[];
  rightTopics: string[];
};

export async function generateAttemptFeedback(input: FeedbackInput): Promise<AttemptFeedback> {
  if (aiAvailable()) {
    try {
      const { output } = await generateText({
        model: model(),
        instructions: COACH,
        prompt: `Review this ${input.subjectName} test attempt by one of our ${input.audience} and coach them.
Score: ${input.score}% (${input.correct} correct, ${input.wrong} wrong, ${input.skipped} skipped). Time used: ${Math.round(input.timeTakenSec / 60)} of ${Math.round(input.durationSec / 60)} minutes.
Topics answered correctly: ${input.rightTopics.join(", ") || "none"}.
Mistakes:
${input.mistakes.map((m, i) => `${i + 1}. [${m.chapter} → ${m.topic}] ${m.question}\n   Chose: ${m.chosen ?? "(skipped)"} | Correct: ${m.correct}`).join("\n") || "none"}`,
        output: Output.object({ schema: feedbackSchema }),
        reasoning: "low",
        abortSignal: AbortSignal.timeout(60_000),
        maxRetries: 1,
      });
      return output;
    } catch (error) {
      reportAiFailure(error);
    }
  }
  return fallbackFeedback(input);
}

function fallbackFeedback(input: FeedbackInput): AttemptFeedback {
  const byTopic = new Map<string, number>();
  for (const m of input.mistakes) byTopic.set(m.topic, (byTopic.get(m.topic) ?? 0) + 1);
  const focus = [...byTopic.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return {
    summary:
      input.score >= 80
        ? `Strong work — you scored ${input.score}% in ${input.subjectName}. Keep the momentum by pushing into harder questions.`
        : input.score >= 50
          ? `A solid base at ${input.score}% in ${input.subjectName}. A few targeted fixes will move you into the top band.`
          : `You scored ${input.score}% in ${input.subjectName}. Revisit the core concepts below, then retest — improvement comes fast with focused practice.`,
    strengths: input.rightTopics.slice(0, 3).map((t) => `Good grip on ${t}`),
    focusAreas: focus.map(([topic, n]) => ({
      topic,
      why: `${n} question${n > 1 ? "s" : ""} missed in this area.`,
      tip: "Re-read the NCERT section, note the key definitions/formulae, then solve 5 practice questions on it.",
    })),
    nextSteps: [
      "Review every explanation below, especially the ones you got wrong.",
      "Generate an AI practice test on your weakest chapter.",
      "Ask the AI tutor to explain any concept that still feels unclear.",
    ],
  };
}

/* ───────────────────────── Insights ───────────────────────── */

const insightsSchema = z.object({
  headline: z.string().describe("One punchy line, max 12 words"),
  overview: z.string().describe("2–3 sentences summarising overall progress"),
  strengths: z.array(z.string()).describe("2–4 strengths"),
  weaknesses: z
    .array(z.object({ topic: z.string(), subject: z.string(), advice: z.string() }))
    .describe("Up to 5 weak topics with specific advice"),
  recommendations: z.array(z.string()).describe("3–5 recommendations for the next two weeks"),
});

export type PerformanceSnapshot = {
  name: string;
  course: string;
  audience: string;
  subjectNames: string[];
  testsCompleted: number;
  streak: number;
  subjects: { subject: string; tests: number; avgScore: number; accuracy: number }[];
  weakTopics: { subject: string; chapter: string; accuracy: number; attempts: number }[];
  strongTopics: { subject: string; chapter: string; accuracy: number; attempts: number }[];
  recentScores: { subject: string; score: number; date: string }[];
};

function snapshotText(s: PerformanceSnapshot) {
  return `Student: ${s.name} (${s.course}). Subjects: ${s.subjectNames.join(", ")}. Tests completed: ${s.testsCompleted}. Current streak: ${s.streak} days.
Subject summary: ${s.subjects.map((x) => `${x.subject}: ${x.tests} tests, avg ${x.avgScore}%, accuracy ${x.accuracy}%`).join("; ") || "no data"}.
Weakest chapters: ${s.weakTopics.map((t) => `${t.subject} – ${t.chapter} (${t.accuracy}% over ${t.attempts} Qs)`).join("; ") || "none yet"}.
Strongest chapters: ${s.strongTopics.map((t) => `${t.subject} – ${t.chapter} (${t.accuracy}%)`).join("; ") || "none yet"}.
Recent scores: ${s.recentScores.map((r) => `${r.date} ${r.subject} ${r.score}%`).join("; ") || "none"}.`;
}

export async function generateInsights(s: PerformanceSnapshot): Promise<InsightsReport> {
  if (aiAvailable()) {
    try {
      const { output } = await generateText({
        model: model(),
        instructions: COACH,
        prompt: `Analyse this student's performance and write their insights report.\n${snapshotText(s)}`,
        output: Output.object({ schema: insightsSchema }),
        reasoning: "low",
        abortSignal: AbortSignal.timeout(60_000),
        maxRetries: 1,
      });
      return output;
    } catch (error) {
      reportAiFailure(error);
    }
  }
  const best = [...s.subjects].sort((a, b) => b.avgScore - a.avgScore)[0];
  return {
    headline: best ? `${best.subject} is your strongest subject right now` : "Your journey starts here",
    overview: `You've completed ${s.testsCompleted} tests with a ${s.streak}-day streak. Keep taking daily tests so the insights get sharper.`,
    strengths: s.strongTopics.length
      ? s.strongTopics.slice(0, 3).map((t) => `${t.chapter} (${t.subject}) — ${t.accuracy}% accuracy`)
      : [`You’ve already completed ${s.testsCompleted} test${s.testsCompleted === 1 ? "" : "s"} — showing up is the hardest part.`],
    weaknesses: s.weakTopics.slice(0, 5).map((t) => ({
      topic: t.chapter,
      subject: t.subject,
      advice: "Revise the NCERT chapter summary and take a focused practice test on it.",
    })),
    recommendations: [
      "Take all five daily tests to keep your streak alive.",
      "Use AI practice on your two weakest chapters this week.",
      "Attempt the Sunday super test to build exam stamina.",
    ],
  };
}

/* ───────────────────────── Study plan ───────────────────────── */

const planSchema = z.object({
  focus: z.string().describe("One sentence describing the plan's focus"),
  days: z
    .array(
      z.object({
        day: z.string().describe("Monday … Sunday"),
        theme: z.string(),
        tasks: z.array(z.object({ subject: z.string(), activity: z.string(), minutes: z.number().int() })),
      }),
    )
    .describe("Exactly 7 days starting Monday"),
  goals: z.array(z.string()).describe("3 measurable goals for the week"),
});

export async function generateStudyPlan(s: PerformanceSnapshot, hoursPerDay: number): Promise<StudyPlanReport> {
  if (aiAvailable()) {
    try {
      const { output } = await generateText({
        model: model(),
        instructions: COACH,
        prompt: `Build a realistic 7-day study plan (Monday to Sunday) for this student (${s.course}) with about ${hoursPerDay} hour(s) per day of self-study.
Prioritise weak chapters, keep strong subjects warm, include the daily TestPrep tests (about 15 min each) and the Sunday super test.
Each day: 2–4 tasks whose minutes add up to roughly ${hoursPerDay * 60}.
${snapshotText(s)}`,
        output: Output.object({ schema: planSchema }),
        reasoning: "low",
        abortSignal: AbortSignal.timeout(60_000),
        maxRetries: 1,
      });
      return output;
    } catch (error) {
      reportAiFailure(error);
    }
  }
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const weak = s.weakTopics.length
    ? s.weakTopics
    : s.subjectNames.slice(0, 3).map((subject) => ({ subject, chapter: `${subject} core concepts`, accuracy: 0, attempts: 0 }));
  return {
    focus: "Build consistency with daily tests and fix your weakest chapters one by one.",
    days: days.map((day, i) => {
      const t = weak[i % weak.length];
      return {
        day,
        theme: day === "Sunday" ? "Sunday super test + review" : `Focus: ${t.chapter}`,
        tasks: [
          { subject: t.subject, activity: `Revise ${t.chapter} from NCERT and make short notes`, minutes: Math.round(hoursPerDay * 25) },
          { subject: t.subject, activity: `AI practice test on ${t.chapter}`, minutes: Math.round(hoursPerDay * 20) },
          { subject: "All subjects", activity: day === "Sunday" ? "Sunday super test" : "Today's daily tests", minutes: Math.round(hoursPerDay * 15) },
        ],
      };
    }),
    goals: ["Complete a test every day", "Raise your weakest chapter above 60% accuracy", "Finish the Sunday super test"],
  };
}

/* ───────────────────────── Community answer ───────────────────────── */

export async function generateForumAnswer(input: { subject: string; title: string; body: string; audience: string }): Promise<string | null> {
  if (!aiAvailable()) return null;
  try {
    const { text } = await generateText({
      model: model(),
      instructions: `${BASE_INSTRUCTIONS}
You are answering a doubt posted on a study forum by one of our ${input.audience}. Explain step by step in simple language, using Markdown (short paragraphs, lists, **bold** key terms). Use LaTeX with $...$ for maths. If the question is in Hindi, answer in Hindi. Keep it under 250 words and end with a one-line tip.`,
      prompt: `Subject: ${input.subject}\nTitle: ${input.title}\n\n${input.body}`,
      reasoning: "low",
      abortSignal: AbortSignal.timeout(60_000),
      maxRetries: 1,
    });
    return text.trim() || null;
  } catch (error) {
    reportAiFailure(error);
    return null;
  }
}
