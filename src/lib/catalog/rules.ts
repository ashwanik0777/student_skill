import type { PromotionRules } from "@/lib/settings";
import { IST } from "@/lib/utils";
import type { CatalogLite, Track } from "./shared";
import { courseForTrack, trackKey } from "./shared";

/**
 * Track-change rules (numbers come from /admin/settings):
 *  1. Fix mistakes: for `correctionDays` after setting up (and before any promotion) a student can change anything.
 *  2. Move up once a year: inside the promotion window a school student can move one step forward
 *     (10 → 11 → 12 → competitive exam), at most once per window, after `minDaysInClass` in the current class.
 *  3. Never backwards: there is no downgrade or revert after a promotion.
 *  4. Competitive students can switch exam once every `examSwitchDays`.
 */

/** Dev aid: PROMOTION_TEST_MODE=true in .env keeps promotions always open outside production builds. */
export const PROMOTION_TEST_MODE = process.env.NODE_ENV !== "production" && process.env.PROMOTION_TEST_MODE === "true";

const DAY = 86_400_000;

function istYear(now: Date) {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric" }).format(now));
}

function istDate(year: number, month: number, day: number) {
  return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+05:30`);
}

/** Yearly promotion window in IST: [start, end). */
export function promotionWindow(rules: PromotionRules, now: Date = new Date()) {
  const y = istYear(now);
  const start = istDate(y, rules.windowStartMonth, rules.windowStartDay);
  let end = istDate(y, rules.windowEndMonth, rules.windowEndDay);
  if (end <= start) end = istDate(y + 1, rules.windowEndMonth, rules.windowEndDay); // window wraps the year end
  const open = now >= start && now < end;
  const nextStart = now < start ? start : istDate(y + 1, rules.windowStartMonth, rules.windowStartDay);
  return { open, start, end, nextStart };
}

export type PromotionTarget = { kind: "grade"; grade: number } | { kind: "exam" };

/** Where a school student goes next: the next class if any course offers it, otherwise competitive exams. */
export function promotionTarget(cat: CatalogLite, track: Track): PromotionTarget | null {
  if (track.kind !== "school") return null;
  const nextGrade = track.grade + 1;
  const hasNext = cat.courses.some((c) => c.active && c.track.kind === "school" && c.track.board === track.board && c.track.grade === nextGrade);
  if (hasNext) return { kind: "grade", grade: nextGrade };
  return cat.courses.some((c) => c.active && c.track.kind === "exam") ? { kind: "exam" } : null;
}

export type TrackState = {
  track: Track | null;
  onboardedAt: Date | null;
  trackSetAt: Date | null;
  lastPromotedAt: Date | null;
};

export type PromotionBlock = "window" | "already" | "tenure" | null;

export function getTrackRules(cat: CatalogLite, rules: PromotionRules, state: TrackState, now: Date = new Date()) {
  const alwaysOpen = rules.promotionAlwaysOpen || PROMOTION_TEST_MODE;
  const correctionEndsAt = state.onboardedAt ? new Date(state.onboardedAt.getTime() + rules.correctionDays * DAY) : null;
  const canCorrect = !!correctionEndsAt && now < correctionEndsAt && !state.lastPromotedAt;

  const win = promotionWindow(rules, now);
  const target = state.track ? promotionTarget(cat, state.track) : null;
  const promotion: { available: boolean; target: PromotionTarget | null; block: PromotionBlock; availableAt: Date | null } = {
    available: false,
    target,
    block: null,
    availableAt: null,
  };
  if (target && alwaysOpen) {
    promotion.available = true;
  } else if (target) {
    const tenureAt = new Date((state.trackSetAt ?? now).getTime() + rules.minDaysInClass * DAY);
    if (!win.open) {
      promotion.block = "window";
      promotion.availableAt = win.nextStart;
    } else if (state.lastPromotedAt && state.lastPromotedAt >= win.start) {
      promotion.block = "already";
      promotion.availableAt = win.nextStart;
    } else if (tenureAt > now) {
      promotion.block = "tenure";
      promotion.availableAt = tenureAt < win.end ? tenureAt : win.nextStart;
    } else {
      promotion.available = true;
    }
  }

  let examSwitch: { available: boolean; availableAt: Date } | null = null;
  if (state.track?.kind === "exam") {
    const at = new Date((state.trackSetAt ?? now).getTime() + rules.examSwitchDays * DAY);
    examSwitch = { available: alwaysOpen || at <= now, availableAt: at };
  }

  return { canCorrect, correctionEndsAt, promotion, examSwitch, window: win, rules };
}

/** Allowed promotions: grade → next grade (any board, any stream), last grade → any competitive exam. */
export function isValidPromotion(cat: CatalogLite, current: Track, next: Track): boolean {
  if (current.kind !== "school") return false;
  const target = promotionTarget(cat, current);
  if (!target) return false;
  if (target.kind === "grade") {
    return next.kind === "school" && next.grade === target.grade && !!courseForTrack(cat, next);
  }
  return next.kind === "exam" && !!courseForTrack(cat, next);
}

export function isValidExamSwitch(cat: CatalogLite, current: Track, next: Track): boolean {
  return current.kind === "exam" && next.kind === "exam" && trackKey(current) !== trackKey(next) && !!courseForTrack(cat, next);
}
