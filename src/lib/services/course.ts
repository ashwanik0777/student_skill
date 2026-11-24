import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { trackEvents } from "@/lib/db/schema";

export async function listTrackEvents(userId: string, limit = 20) {
  return db
    .select({ id: trackEvents.id, type: trackEvents.type, fromKey: trackEvents.fromKey, toKey: trackEvents.toKey, createdAt: trackEvents.createdAt })
    .from(trackEvents)
    .where(eq(trackEvents.userId, userId))
    .orderBy(desc(trackEvents.createdAt))
    .limit(limit);
}
