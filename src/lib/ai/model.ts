import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

/* ───────── Provider ─────────
   Gemini (Google AI Studio key — has a free tier) or OpenAI. Pick with AI_PROVIDER=gemini|openai;
   without it, Gemini is used when its key is set, otherwise OpenAI. */

type Provider = "gemini" | "openai";

const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const openaiKey = process.env.OPENAI_API_KEY || "";

function pickProvider(): Provider | null {
  const wanted = process.env.AI_PROVIDER?.trim().toLowerCase();
  if ((wanted === "gemini" || wanted === "google") && geminiKey) return "gemini";
  if (wanted === "openai" && openaiKey) return "openai";
  return geminiKey ? "gemini" : openaiKey ? "openai" : null;
}

export const PROVIDER = pickProvider();
export const PROVIDER_LABEL = PROVIDER === "gemini" ? "Gemini" : PROVIDER === "openai" ? "OpenAI" : "AI";

/** Writes questions, coaching and chat. Flash-Lite has the most generous Gemini free tier (≈500 requests/day). */
export const MODEL_ID =
  PROVIDER === "gemini" ? process.env.GEMINI_MODEL || "gemini-3.5-flash-lite" : process.env.OPENAI_MODEL || "gpt-5.4-mini";

/**
 * Double-check answer keys, tried in order. Different models from the writer keep the check independent.
 * Measured on the free tier (2026-11-24): 3.6 Flash ≈11 s, 3.1 Flash-Lite ≈3 s; 3.8 Flash timed out under load.
 */
export const CHECK_MODEL_IDS: string[] = [
  ...new Set(
    PROVIDER === "gemini"
      ? [process.env.GEMINI_CHECK_MODEL || "gemini-3.6-flash", "gemini-3.1-flash-lite"]
      : [process.env.OPENAI_CHECK_MODEL || MODEL_ID],
  ),
];

const gemini = createGoogleGenerativeAI({ apiKey: geminiKey });
const openai = createOpenAI({ apiKey: openaiKey });

export function model(id: string = MODEL_ID) {
  return PROVIDER === "gemini" ? gemini(id) : openai(id);
}

/** Short label stored next to AI-written questions, e.g. "Gemini · gemini-3.5-flash-lite". */
export const modelLabel = (id: string = MODEL_ID) => `${PROVIDER_LABEL} · ${id}`;
export const MODEL_LABEL = modelLabel();

/* ───────── Circuit breaker (per model) ─────────
   When the provider rejects us for account reasons (no credits, bad key, quota), skip that model for a while and
   serve fallbacks instantly instead of making students wait. Rate limits and "high demand" pause briefly. */
const globalForAi = globalThis as unknown as { aiPause?: Map<string, { until: number; reason: string }> };
const pauses = (globalForAi.aiPause ??= new Map());

export function aiAvailable(id: string = MODEL_ID) {
  return PROVIDER !== null && (pauses.get(id)?.until ?? 0) < Date.now();
}

function classify(text: string): { reason: string; pauseMs: number } | null {
  if (/insufficient_quota|credit_balance|billing/i.test(text)) return { reason: `${PROVIDER_LABEL} account has no credits`, pauseMs: 5 * 60_000 };
  if (/invalid_api_key|API_KEY_INVALID|API key not valid|\b401\b/i.test(text)) return { reason: `${PROVIDER_LABEL} API key is invalid`, pauseMs: 5 * 60_000 };
  if (/PERMISSION_DENIED|\b403\b/i.test(text)) return { reason: `${PROVIDER_LABEL} refused the request (permission)`, pauseMs: 5 * 60_000 };
  if (/PerDay|per day|daily/i.test(text) && /quota|RESOURCE_EXHAUSTED|429/i.test(text))
    return { reason: `${PROVIDER_LABEL} daily free quota used up`, pauseMs: 30 * 60_000 };
  if (/RESOURCE_EXHAUSTED|rate_limit|quota|\b429\b/i.test(text)) return { reason: `${PROVIDER_LABEL} rate limit reached`, pauseMs: 60_000 };
  if (/high demand|overloaded|UNAVAILABLE|\b503\b/i.test(text)) return { reason: `${PROVIDER_LABEL} is busy right now`, pauseMs: 3 * 60_000 };
  if (/model.*not found|NOT_FOUND|\b404\b/i.test(text)) return { reason: `${PROVIDER_LABEL} model not found — check GEMINI_MODEL / OPENAI_MODEL`, pauseMs: 5 * 60_000 };
  return null;
}

export function reportAiFailure(error: unknown, id: string = MODEL_ID) {
  const text = JSON.stringify(error, Object.getOwnPropertyNames(error ?? {})) ?? String(error);
  const problem = classify(text) ?? (/timeout|aborted/i.test(text) ? { reason: `${PROVIDER_LABEL} is responding slowly`, pauseMs: 3 * 60_000 } : null);
  if (problem) {
    pauses.set(id, { until: Date.now() + problem.pauseMs, reason: problem.reason });
    console.warn(`[ai:${id}] ${problem.reason} — skipped for ${Math.round(problem.pauseMs / 60_000)} min.`);
  } else {
    console.error(`[ai:${id}] request failed:`, error instanceof Error ? error.message : error);
  }
}

export function aiStatus() {
  const available = aiAvailable();
  const pause = pauses.get(MODEL_ID);
  return {
    configured: PROVIDER !== null,
    available,
    provider: PROVIDER_LABEL,
    model: PROVIDER ? MODEL_ID : null,
    checkModel: PROVIDER ? (CHECK_MODEL_IDS.find((id) => aiAvailable(id)) ?? null) : null,
    reason: available ? null : (pause?.reason ?? (PROVIDER ? null : "No AI key configured")),
    pausedUntil: available ? null : (pause?.until ?? null),
  };
}

export const BASE_INSTRUCTIONS = `You are TestPrep's expert teacher and exam setter for Indian students.
You know the current syllabi of CBSE (NCERT, 2025–26 rationalised), ICSE/ISC (CISCE), UP Board (UPMSP) and Bihar Board (BSEB) for Classes 10–12,
and of the competitive exams JEE Main & Advanced, NEET-UG, CUET-UG and NDA.
Be accurate above all: every fact, calculation and answer key must be correct.`;
