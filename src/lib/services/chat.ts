import "server-only";
import type { UIMessage } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatThreads } from "@/lib/db/schema";

export const THREAD_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export async function listThreads(userId: string, limit = 30) {
  return db
    .select({ id: chatThreads.id, title: chatThreads.title, updatedAt: chatThreads.updatedAt })
    .from(chatThreads)
    .where(eq(chatThreads.userId, userId))
    .orderBy(desc(chatThreads.updatedAt))
    .limit(limit);
}

export async function getThread(userId: string, id: string) {
  if (!THREAD_ID_RE.test(id)) return null;
  const row = await db.query.chatThreads.findFirst({
    where: and(eq(chatThreads.id, id), eq(chatThreads.userId, userId)),
  });
  if (!row) return null;
  return { ...row, messages: row.messages as UIMessage[] };
}

/** Upserts the thread. Returns false if the id belongs to another user. */
export async function saveThread(userId: string, id: string, messages: UIMessage[]) {
  const existing = await db.query.chatThreads.findFirst({ where: eq(chatThreads.id, id), columns: { userId: true, title: true } });
  if (existing && existing.userId !== userId) return false;
  const firstUser = messages.find((m) => m.role === "user");
  const firstText = firstUser?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim() ?? "";
  const title = existing?.title && existing.title !== "New conversation" ? existing.title : firstText.slice(0, 70) || "New conversation";
  await db
    .insert(chatThreads)
    .values({ id, userId, title, messages })
    .onConflictDoUpdate({ target: chatThreads.id, set: { messages, title, updatedAt: new Date() } });
  return true;
}

export async function deleteThread(userId: string, id: string) {
  await db.delete(chatThreads).where(and(eq(chatThreads.id, id), eq(chatThreads.userId, userId)));
}
