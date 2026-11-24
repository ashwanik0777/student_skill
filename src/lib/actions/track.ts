"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { getTrackRules, isValidExamSwitch, isValidPromotion } from "@/lib/catalog/rules";
import { getCatalogLite, getCourseConfig } from "@/lib/catalog/server";
import { resolveTrack, sameTrack, trackColumns, trackFromUser, trackKey } from "@/lib/catalog/shared";
import { db } from "@/lib/db";
import { trackEvents, user } from "@/lib/db/schema";
import { awardBadges, badgeTrackOf } from "@/lib/services/badges";
import { requireUser, userTag } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";

export type TrackChangeMode = "correct" | "promote" | "switch_exam";

type Result = { ok: true; label: string } | { ok: false; error: string };

const fail = (error: string): Result => ({ ok: false, error });

/**
 * The only way a student's course changes after onboarding. All rules are enforced here on the server
 * (see src/lib/catalog/rules.ts and /admin/settings): fix-mistakes window, one forward promotion per year,
 * exam-switch cooldown.
 */
export async function changeTrackAction(input: {
  mode: TrackChangeMode;
  kind: string;
  board?: string | null;
  grade?: number | null;
  stream?: string | null;
  exam?: string | null;
}): Promise<Result> {
  const [current, cat, settings] = await Promise.all([requireUser(), getCatalogLite(), getSettings()]);
  const from = trackFromUser(current);
  if (!from) return fail("Please finish setting up your profile first.");
  const next = resolveTrack(cat, input);
  if (!next) return fail("Please choose a valid option.");
  if (sameTrack(from, next.track)) return fail("That’s already your current course.");

  const now = new Date();
  const rules = getTrackRules(
    cat,
    settings.rules,
    { track: from, onboardedAt: current.onboardedAt, trackSetAt: current.trackSetAt, lastPromotedAt: current.lastPromotedAt },
    now,
  );
  const r = settings.rules;

  let type: "corrected" | "promoted" | "exam_switched";
  if (input.mode === "correct") {
    if (!rules.canCorrect) {
      return fail(`The ${r.correctionDays}-day window to fix your setup has closed. You can move up during the yearly promotion window.`);
    }
    type = "corrected";
  } else if (input.mode === "promote") {
    if (!rules.promotion.available) {
      const when = rules.promotion.availableAt ? formatDate(rules.promotion.availableAt, { year: "numeric" }) : "later";
      return fail(
        rules.promotion.block === "already"
          ? `You’ve already moved up this year. Next chance: ${when}.`
          : rules.promotion.block === "tenure"
            ? `You can move up ${r.minDaysInClass} days after joining your current class — from ${when}.`
            : `Moving up opens on ${when}.`,
      );
    }
    if (!isValidPromotion(cat, from, next.track)) return fail("You can only move forward to your next class or exam — never back.");
    type = "promoted";
  } else {
    if (!rules.examSwitch?.available) {
      return fail(
        `You can switch exams once every ${r.examSwitchDays} days — next on ${rules.examSwitch ? formatDate(rules.examSwitch.availableAt, { year: "numeric" }) : "later"}.`,
      );
    }
    if (!isValidExamSwitch(cat, from, next.track)) return fail("Please choose a different competitive exam.");
    type = "exam_switched";
  }

  const nextConfig = await getCourseConfig(next.key);
  const changed = await db.transaction(async (tx) => {
    // Optimistic guard: if two requests race, only the first one applies.
    const rows = await tx
      .update(user)
      .set({ ...trackColumns(next), trackSetAt: now, ...(type === "promoted" ? { lastPromotedAt: now } : {}) })
      .where(and(eq(user.id, current.id), current.trackSetAt ? eq(user.trackSetAt, current.trackSetAt) : isNull(user.trackSetAt)))
      .returning({ id: user.id });
    if (!rows.length) return false;
    await tx.insert(trackEvents).values({ userId: current.id, type, fromKey: trackKey(from), toKey: next.key });
    if (type === "promoted") await awardBadges(tx, current.id, { track: badgeTrackOf(nextConfig) });
    return true;
  });
  if (!changed) return fail("Your course was just updated. Please refresh the page.");

  updateTag(userTag(current.id));
  revalidatePath("/", "layout");
  return { ok: true, label: next.name };
}
