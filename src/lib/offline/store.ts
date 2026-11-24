"use client";

import { del, get, keys, set } from "idb-keyval";
import type { PublicQuestion } from "@/lib/types";

export type OfflinePackage = {
  id: string;
  title: string;
  kind: string;
  subject: string;
  durationSec: number;
  questions: PublicQuestion[];
  downloadedAt: string;
};

type AnswerPayload = { questionId: string; selectedIndex: number | null; timeSpentSec?: number };

export type OutboxEntry =
  | {
      id: string;
      type: "submit";
      attemptId: string;
      title: string;
      payload: { answers: AnswerPayload[]; endReason: "submitted" | "time_up" | "tab_switch" };
      createdAt: string;
    }
  | {
      id: string;
      type: "offline-attempt";
      testId: string;
      title: string;
      payload: { testId: string; startedAt: string; completedAt: string; answers: AnswerPayload[] };
      createdAt: string;
    };

const PKG = (id: string) => `pkg:${id}`;
const OUTBOX = "outbox";

export async function savePackage(pkg: OfflinePackage) {
  await set(PKG(pkg.id), pkg);
}

export async function getPackage(id: string) {
  return (await get<OfflinePackage>(PKG(id))) ?? null;
}

export async function listPackages(): Promise<OfflinePackage[]> {
  const all = await keys();
  const pkgs = await Promise.all(all.filter((k) => String(k).startsWith("pkg:")).map((k) => get<OfflinePackage>(k)));
  return pkgs.filter(Boolean).sort((a, b) => b!.downloadedAt.localeCompare(a!.downloadedAt)) as OfflinePackage[];
}

export async function removePackage(id: string) {
  await del(PKG(id));
}

export async function getOutbox(): Promise<OutboxEntry[]> {
  return (await get<OutboxEntry[]>(OUTBOX)) ?? [];
}

export async function addToOutbox(entry: OutboxEntry) {
  const box = await getOutbox();
  await set(OUTBOX, [...box.filter((e) => e.id !== entry.id), entry]);
}

/** Sends everything queued while offline. Returns how many entries were delivered. */
export async function flushOutbox(): Promise<{ sent: number; remaining: number }> {
  const box = await getOutbox();
  if (!box.length || (typeof navigator !== "undefined" && !navigator.onLine)) return { sent: 0, remaining: box.length };
  const keep: OutboxEntry[] = [];
  let sent = 0;
  for (const entry of box) {
    try {
      const res =
        entry.type === "submit"
          ? await fetch(`/api/attempts/${entry.attemptId}/submit`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(entry.payload),
            })
          : await fetch("/api/offline/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(entry.payload),
            });
      if (res.ok) {
        sent++;
        if (entry.type === "offline-attempt") await removePackage(entry.testId);
      } else if (res.status === 401 || res.status >= 500) {
        keep.push(entry); // try again later (signed out or server issue)
      }
      // other 4xx: drop — the attempt no longer exists or is invalid
    } catch {
      keep.push(entry);
    }
  }
  await set(OUTBOX, keep);
  return { sent, remaining: keep.length };
}

/* ───────── Local exam progress (survives reloads) ───────── */

export type LocalExamState = {
  answers: Record<string, number | null>;
  marked: string[];
  visited: string[];
  timeSpent: Record<string, number>;
  current: number;
};

const LOCAL = (attemptId: string) => `tp:exam:${attemptId}`;

export function loadLocalExam(attemptId: string): LocalExamState | null {
  try {
    const raw = localStorage.getItem(LOCAL(attemptId));
    return raw ? (JSON.parse(raw) as LocalExamState) : null;
  } catch {
    return null;
  }
}

export function saveLocalExam(attemptId: string, state: LocalExamState) {
  try {
    localStorage.setItem(LOCAL(attemptId), JSON.stringify(state));
  } catch {
    /* storage full or blocked — non-fatal */
  }
}

export function clearLocalExam(attemptId: string) {
  try {
    localStorage.removeItem(LOCAL(attemptId));
  } catch {
    /* ignore */
  }
}
