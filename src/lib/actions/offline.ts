"use server";

import { revalidatePath } from "next/cache";
import { TestError, getTodayTests, prepareDailyTest } from "@/lib/services/tests";
import { requireLearner } from "@/lib/session";

/** Makes sure every unfinished daily test for today exists so it can be downloaded. */
export async function prepareTodayForOfflineAction(): Promise<{ ok: true; data: { testIds: string[] } } | { ok: false; error: string }> {
  const { user, config } = await requireLearner();
  try {
    const today = await getTodayTests(user.id, config);
    const open = today.items.filter((i) => i.status !== "completed");
    const ids = await Promise.all(open.map((i) => i.testId ?? prepareDailyTest(user.id, config, i.subject)));
    const sunday = today.sunday && today.sunday.status !== "completed" && today.sunday.testId ? [today.sunday.testId] : [];
    revalidatePath("/tests");
    revalidatePath("/dashboard");
    return { ok: true, data: { testIds: [...ids, ...sunday] } };
  } catch (error) {
    if (error instanceof TestError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Couldn't prepare your tests. Please try again." };
  }
}
