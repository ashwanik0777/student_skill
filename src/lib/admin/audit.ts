import "server-only";
import { db } from "@/lib/db";
import { adminAudit } from "@/lib/db/schema";
import type { AuditAction } from "./audit-actions";

type Entry = {
  action: AuditAction;
  targetType: "user" | "staff" | "post" | "reply" | "announcement" | "course" | "subject" | "syllabus" | "chapter" | "question" | "option" | "settings";
  targetId?: string | null;
  summary: string;
  meta?: Record<string, unknown>;
};

/** Append-only record of a staff action. The actor's name is snapshotted so entries survive account removal. */
export async function recordAudit(actor: { id: string; name: string }, entry: Entry) {
  await db.insert(adminAudit).values({ actorId: actor.id, actorName: actor.name, ...entry });
}
