import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { TestError, startAttempt, submitAttempt } from "@/lib/services/tests";
import { getCourseConfig } from "@/lib/catalog/server";
import { trackFromUser } from "@/lib/catalog/shared";
import { badgeTrackOf } from "@/lib/services/badges";
import { leaderboardTag } from "@/lib/services/leaderboard";
import { getApiUser } from "@/lib/session";

const bodySchema = z.object({
  testId: z.string().max(64),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  answers: z
    .array(
      z.object({
        questionId: z.string().max(64),
        selectedIndex: z.number().int().min(0).max(9).nullable(),
        timeSpentSec: z.number().min(0).max(36_000).optional(),
      }),
    )
    .max(100),
});

/** Grades a test that was taken offline. Idempotent: re-syncing a completed test is a no-op. */
export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { testId, answers, startedAt, completedAt } = parsed.data;
  try {
    const attempt = await startAttempt(user.id, testId);
    const result = await submitAttempt(user.id, attempt.id, {
      answers,
      endReason: "offline",
      clientStartedAt: startedAt,
      clientCompletedAt: completedAt,
    }, badgeTrackOf(await getCourseConfig(trackFromUser(user))));
    if (!result.alreadyCompleted && user.cohort) revalidateTag(leaderboardTag(user.cohort), "max");
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TestError) return NextResponse.json({ error: error.message }, { status: 404 });
    console.error(error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
