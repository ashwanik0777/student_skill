import "server-only";

/**
 * Sliding-window limiter kept in memory. Good for a single server instance;
 * swap for Redis/Upstash when running multiple instances.
 */
const globalForRl = globalThis as unknown as { rlBuckets?: Map<string, number[]> };
const buckets = (globalForRl.rlBuckets ??= new Map<string, number[]>());

export function rateLimit(key: string, limit: number, windowMs: number): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return { ok: true };
}

export function limitMessage(retryAfterSec: number) {
  const mins = Math.ceil(retryAfterSec / 60);
  return `You’re going a bit fast! Please try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
}
