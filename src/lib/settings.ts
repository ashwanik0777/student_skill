import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";

export const SETTINGS_TAG = "settings";

/** Course-change rules. Defaults match the rules agreed with the product owner; editable at /admin/settings. */
export const rulesSchema = z.object({
  /** Days after sign-up during which a student can change anything. */
  correctionDays: z.number().int().min(0).max(90),
  /** Minimum days in the current class before moving up. */
  minDaysInClass: z.number().int().min(0).max(365),
  /** Days between competitive-exam switches. */
  examSwitchDays: z.number().int().min(0).max(365),
  /** Yearly promotion window (IST), inclusive start, exclusive end. */
  windowStartMonth: z.number().int().min(1).max(12),
  windowStartDay: z.number().int().min(1).max(31),
  windowEndMonth: z.number().int().min(1).max(12),
  windowEndDay: z.number().int().min(1).max(31),
  /** Ignore the window and tenure rules (for testing / special cases). */
  promotionAlwaysOpen: z.boolean(),
});
export type PromotionRules = z.infer<typeof rulesSchema>;

export const generalSchema = z.object({
  /** New accounts can be created. */
  signupsOpen: z.boolean(),
  /** Short notice shown on the sign-in / sign-up page (e.g. maintenance). Empty = hidden. */
  authNotice: z.string().max(200),
});
export type GeneralSettings = z.infer<typeof generalSchema>;

export const DEFAULT_RULES: PromotionRules = {
  correctionDays: 7,
  minDaysInClass: 30,
  examSwitchDays: 30,
  windowStartMonth: 2,
  windowStartDay: 1,
  windowEndMonth: 8,
  windowEndDay: 1,
  promotionAlwaysOpen: false,
};

export const DEFAULT_GENERAL: GeneralSettings = { signupsOpen: true, authNotice: "" };

export type AppSettings = { rules: PromotionRules; general: GeneralSettings };

/** All settings in one cached read; `updateTag(SETTINGS_TAG)` after every save. Unknown/invalid values fall back to defaults. */
export async function getSettings(): Promise<AppSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag(SETTINGS_TAG);
  const rows = await db.query.settings.findMany();
  const get = (key: string) => rows.find((r) => r.key === key)?.value;
  const rules = rulesSchema.safeParse({ ...DEFAULT_RULES, ...(get("rules") as object | undefined) });
  const general = generalSchema.safeParse({ ...DEFAULT_GENERAL, ...(get("general") as object | undefined) });
  return { rules: rules.success ? rules.data : DEFAULT_RULES, general: general.success ? general.data : DEFAULT_GENERAL };
}
