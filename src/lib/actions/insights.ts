"use server";

import { revalidatePath } from "next/cache";
import { generateInsights, generateStudyPlan } from "@/lib/ai/reports";
import { db } from "@/lib/db";
import { aiReports } from "@/lib/db/schema";
import { limitMessage, rateLimit } from "@/lib/rate-limit";
import { getPerformanceSnapshot } from "@/lib/services/analytics";
import { requireLearner } from "@/lib/session";

type Result = { ok: true } | { ok: false; error: string };

export async function generateInsightsAction(): Promise<Result> {
  const { user, config } = await requireLearner();
  const limited = rateLimit(`insights:${user.id}`, 6, 60 * 60_000);
  if (!limited.ok) return { ok: false, error: limitMessage(limited.retryAfterSec) };
  const snapshot = await getPerformanceSnapshot(user.id, config);
  if (snapshot.testsCompleted === 0) return { ok: false, error: "Complete at least one test so we have something to analyse." };
  const data = await generateInsights(snapshot);
  await db.insert(aiReports).values({ userId: user.id, kind: "insights", data });
  revalidatePath("/insights");
  return { ok: true };
}

export async function generateStudyPlanAction(hoursPerDay: number): Promise<Result> {
  const { user, config } = await requireLearner();
  const limited = rateLimit(`plan:${user.id}`, 6, 60 * 60_000);
  if (!limited.ok) return { ok: false, error: limitMessage(limited.retryAfterSec) };
  const hours = [1, 2, 3].includes(hoursPerDay) ? hoursPerDay : 2;
  const snapshot = await getPerformanceSnapshot(user.id, config);
  const data = await generateStudyPlan(snapshot, hours);
  await db.insert(aiReports).values({ userId: user.id, kind: "study_plan", data });
  revalidatePath("/insights");
  return { ok: true };
}
