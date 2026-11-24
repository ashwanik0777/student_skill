import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { eq } from "drizzle-orm";
import { aiAvailable, model, reportAiFailure } from "@/lib/ai/model";
import { db } from "@/lib/db";
import { limitMessage, rateLimit } from "@/lib/rate-limit";
import { chatThreads } from "@/lib/db/schema";
import { THREAD_ID_RE, saveThread } from "@/lib/services/chat";
import { weakTopics } from "@/lib/services/tests";
import { getCatalogLite } from "@/lib/catalog/server";
import { subjectName } from "@/lib/catalog/shared";
import { getApiLearner } from "@/lib/session";

export const maxDuration = 60;

function instructions(name: string, course: string, subjects: string[], weak: string[]) {
  return `You are "TestPrep Tutor", a friendly, patient AI tutor for Indian students.
This student is preparing for: ${course}. Their subjects: ${subjects.join(", ")}.

How to answer:
- Explain step by step in simple language, with a short worked example where useful.
- Use Markdown: short paragraphs, numbered steps, bullet points, **bold** key terms, and tables for comparisons.
- For maths and science use LaTeX: inline $...$ and display $$...$$.
- Reply in the student's language: Hindi (Devanagari) if they write in Hindi, Hinglish if they write in Hinglish, otherwise English.
- Stay within their syllabus/exam pattern and mention the chapter when it helps. Finish longer answers with a one-line tip or a quick check question.
- If a request is unrelated to studies or inappropriate, kindly steer back to learning.

Student: ${name}.${weak.length ? ` Recently weak in: ${weak.join("; ")}. Connect explanations to these when relevant.` : ""}`;
}

export async function POST(request: Request) {
  const learner = await getApiLearner();
  if (!learner) return new Response("Please sign in again.", { status: 401 });
  const { user, config } = learner;

  const body = (await request.json().catch(() => null)) as { id?: string; messages?: UIMessage[] } | null;
  if (!body?.id || !THREAD_ID_RE.test(body.id) || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response("Bad request", { status: 400 });
  }
  const owner = await db.query.chatThreads.findFirst({ where: eq(chatThreads.id, body.id), columns: { userId: true } });
  if (owner && owner.userId !== user.id) return new Response("Not found", { status: 404 });

  let messages: UIMessage[];
  try {
    messages = await validateUIMessages({ messages: body.messages.slice(-30) });
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const last = messages.at(-1);
  const lastText = last?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
  if (lastText.length > 4000) return new Response("That message is too long. Please keep it under 4,000 characters.", { status: 413 });

  if (!aiAvailable()) {
    return new Response("The AI tutor is taking a short break right now. Please try again in a few minutes.", { status: 503 });
  }
  const limited = rateLimit(`chat:${user.id}`, 30, 10 * 60_000);
  if (!limited.ok) return new Response(limitMessage(limited.retryAfterSec), { status: 429 });

  const [weak, cat] = await Promise.all([weakTopics(user.id, { trackKey: config.key }, 5), getCatalogLite()]);
  const result = streamText({
    model: model(),
    instructions: instructions(
      user.name.split(" ")[0],
      config.label,
      config.subjects.map((s) => subjectName(cat, s.slug)),
      weak.map((w) => `${w.topic} (${subjectName(cat, w.subject)})`),
    ),
    messages: await convertToModelMessages(messages),
    reasoning: "low",
    abortSignal: request.signal,
    onError: ({ error }) => reportAiFailure(error),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      onError: () => "Sorry — I couldn’t finish that answer. Please try again in a moment.",
      onEnd: async ({ messages: all }) => {
        // Drop assistant turns that produced no text (e.g. the provider failed mid-stream).
        const clean = (all as UIMessage[]).filter(
          (m) => m.role !== "assistant" || m.parts.some((p) => p.type === "text" && p.text.trim()),
        );
        if (clean.some((m) => m.role === "assistant")) await saveThread(user.id, body.id!, clean);
      },
    }),
  });
}
