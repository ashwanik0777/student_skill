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

/** Double-checks answer keys. A different, stronger model makes the check more independent (fewer requests/day on the free tier). */
export const CHECK_MODEL_ID =
  PROVIDER === "gemini" ? process.env.GEMINI_CHECK_MODEL || "gemini-3.8-flash" : process.env.OPENAI_CHECK_MODEL || MODEL_ID;

const gemini = createGoogleGenerativeAI({ apiKey: geminiKey });
const openai = createOpenAI({ apiKey: openaiKey });

/** "main" for everything; "check" only for the answer double-check, with its own pause so one can't block the other. */
export type Lane = "main" | "check";

export function model(lane: Lane = "main") {
  const id = lane === "check" ? CHECK_MODEL_ID : MODEL_ID;
  return PROVIDER === "gemini" ? gemini(id) : openai(id);
}

/** Short label stored next to AI-written questions, e.g. "Gemini · gemini-3.5-flash-lite". */
export const MODEL_LABEL = `${PROVIDER_LABEL} · ${MODEL_ID}`;
export const CHECK_MODEL_LABEL = `${PROVIDER_LABEL} · ${CHECK_MODEL_ID}`;

/* ───────── Circuit breaker ─────────
   When the provider rejects us for account reasons (no credits, bad key, quota), skip AI for a while and serve
   fallbacks instantly instead of making students wait. Per-minute limits (common on free tiers) pause briefly. */
const globalForAi = globalThis as unknown as { aiPause?: Partial<Record<Lane, { until: number; reason: string }>> };
const pauses = (globalForAi.aiPause ??= {});

export function aiAvailable(lane: Lane = "main") {
  return PROVIDER !== null && (pauses[lane]?.until ?? 0) < Date.now();
}

function classify(text: string): { reason: string; pauseMs: number } | null {
  if (/insufficient_quota|credit_balance|billing/i.test(text)) return { reason: `${PROVIDER_LABEL} account has no credits`, pauseMs: 5 * 60_000 };
  if (/invalid_api_key|API_KEY_INVALID|API key not valid|\b401\b/i.test(text)) return { reason: `${PROVIDER_LABEL} API key is invalid`, pauseMs: 5 * 60_000 };
  if (/PERMISSION_DENIED|\b403\b/i.test(text)) return { reason: `${PROVIDER_LABEL} refused the request (permission)`, pauseMs: 5 * 60_000 };
  if (/PerDay|per day|daily/i.test(text) && /quota|RESOURCE_EXHAUSTED|429/i.test(text))
    return { reason: `${PROVIDER_LABEL} daily free quota used up`, pauseMs: 30 * 60_000 };
  if (/RESOURCE_EXHAUSTED|rate_limit|quota|\b429\b/i.test(text)) return { reason: `${PROVIDER_LABEL} rate limit reached`, pauseMs: 60_000 };
  if (/model.*not found|NOT_FOUND|\b404\b/i.test(text)) return { reason: `${PROVIDER_LABEL} model not found — check GEMINI_MODEL / OPENAI_MODEL`, pauseMs: 5 * 60_000 };
  return null;
}

export function reportAiFailure(error: unknown, lane: Lane = "main") {
  const text = JSON.stringify(error, Object.getOwnPropertyNames(error ?? {})) ?? String(error);
  const problem = classify(text);
  if (problem) {
    pauses[lane] = { until: Date.now() + problem.pauseMs, reason: problem.reason };
    console.warn(`[ai:${lane}] ${problem.reason} — paused for ${Math.round(problem.pauseMs / 60_000)} min.`);
  } else {
    console.error(`[ai:${lane}] request failed:`, error instanceof Error ? error.message : error);
  }
}

export function aiStatus() {
  const available = aiAvailable();
  const pause = pauses.main;
  return {
    configured: PROVIDER !== null,
    available,
    provider: PROVIDER_LABEL,
    model: PROVIDER ? MODEL_ID : null,
    checkModel: PROVIDER ? CHECK_MODEL_ID : null,
    reason: available ? null : (pause?.reason ?? (PROVIDER ? null : "No AI key configured")),
    pausedUntil: available ? null : (pause?.until ?? null),
  };
}

export const BASE_INSTRUCTIONS = `You are TestPrep's expert teacher and exam setter for Indian students.
You know the current syllabi of CBSE (NCERT, 2025–26 rationalised), ICSE/ISC (CISCE), UP Board (UPMSP) and Bihar Board (BSEB) for Classes 10–12,
and of the competitive exams JEE Main & Advanced, NEET-UG, CUET-UG and NDA.
Be accurate above all: every fact, calculation and answer key must be correct.`;
