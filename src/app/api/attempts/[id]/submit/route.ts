import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCourseConfig } from "@/lib/catalog/server";
import { trackFromUser } from "@/lib/catalog/shared";
import { badgeTrackOf } from "@/lib/services/badges";
import { leaderboardTag } from "@/lib/services/leaderboard";
import { TestError, submitAttempt } from "@/lib/services/tests";
import { getApiUser } from "@/lib/session";

const bodySchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().max(64),
        selectedIndex: z.number().int().min(0).max(9).nullable(),
        timeSpentSec: z.number().min(0).max(36_000).optional(),
      }),
    )
    .max(100),
  endReason: z.enum(["submitted", "time_up", "tab_switch"]),
});

/** Accepts JSON from fetch() and text/plain from navigator.sendBeacon(). */
export async function POST(request: Request, ctx: RouteContext<"/api/attempts/[id]/submit">) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  let json: unknown;
  try {
    json = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    const result = await submitAttempt(user.id, id, parsed.data, badgeTrackOf(await getCourseConfig(trackFromUser(user))));
    if (!result.alreadyCompleted && user.cohort) revalidateTag(leaderboardTag(user.cohort), "max");
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TestError) return NextResponse.json({ error: error.message }, { status: 404 });
    console.error(error);
    return NextResponse.json({ error: "Could not submit" }, { status: 500 });
  }
}
