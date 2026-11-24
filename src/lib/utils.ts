import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const IST = "Asia/Kolkata";

/** Calendar day in India (YYYY-MM-DD). Students take “today's” tests on IST days. */
export function dayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, evaluated in IST. */
export function weekdayIST(date: Date = new Date()): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: IST, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

/** Start of the current IST week (Monday 00:00 IST) as a UTC Date. */
export function startOfWeekIST(date: Date = new Date()): Date {
  const today = dayKey(date);
  const wd = weekdayIST(date);
  const monday = addDays(today, wd === 0 ? -6 : 1 - wd);
  return new Date(`${monday}T00:00:00+05:30`);
}

export function greeting(date: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: IST, hour: "numeric", hour12: false }).format(date),
  );
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return sec ? `${m}m ${sec}s` : `${m}m`;
  return `${sec}s`;
}

export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function formatDate(date: Date | string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    ...opts,
  }).format(new Date(date));
}

export function timeAgo(date: Date | string, now: Date = new Date()): string {
  const diff = (now.getTime() - new Date(date).getTime()) / 1000;
  if (diff < 45) return "just now";
  const mins = Math.round(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date, { year: now.getFullYear() === new Date(date).getFullYear() ? undefined : "numeric" });
}

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function pluralize(n: number, word: string, plural = `${word}s`) {
  return `${n} ${n === 1 ? word : plural}`;
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function scoreTone(score: number) {
  if (score >= 80) return { label: "Excellent", text: "text-success", soft: "bg-success-soft text-success" };
  if (score >= 60) return { label: "Good", text: "text-brand-ink", soft: "bg-brand-soft text-brand-ink" };
  if (score >= 40) return { label: "Fair", text: "text-warning", soft: "bg-warning-soft text-warning" };
  return { label: "Needs work", text: "text-danger", soft: "bg-danger-soft text-danger" };
}
