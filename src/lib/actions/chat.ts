"use server";

import { deleteThread } from "@/lib/services/chat";
import { requireUser } from "@/lib/session";

export async function deleteThreadAction(id: string) {
  const user = await requireUser();
  await deleteThread(user.id, id);
  return { ok: true as const };
}
