"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCatalogLite } from "@/lib/catalog/server";
import { resolveTrack, trackColumns } from "@/lib/catalog/shared";
import { db } from "@/lib/db";
import { trackEvents, user, userStats } from "@/lib/db/schema";
import { INDIAN_STATES } from "@/lib/india";
import { requireUser, userTag } from "@/lib/session";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(60, "That name is too long."),
  school: z.string().trim().max(120, "That name is too long."),
  city: z.string().trim().min(2, "Please enter your city.").max(60, "That name is too long."),
  state: z.enum(INDIAN_STATES as [string, ...string[]], { message: "Please choose your state." }),
});

type ErrorKey = keyof z.infer<typeof profileSchema> | "track" | "form";

export type ProfileState = {
  ok?: boolean;
  errors?: Partial<Record<ErrorKey, string>>;
  values?: Record<string, string>;
};

const FIELDS = ["name", "school", "city", "state", "kind", "board", "grade", "stream", "exam"];

function read(formData: FormData) {
  return Object.fromEntries(FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));
}

function parseProfile(raw: Record<string, string>, schoolRequired: boolean) {
  const errors: ProfileState["errors"] = {};
  const result = profileSchema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) errors[issue.path[0] as ErrorKey] ??= issue.message;
  }
  if (schoolRequired && raw.school.trim().length < 2) errors.school ??= "Please enter your school name.";
  return { data: result.success ? result.data : null, errors };
}

/** First-time setup: what the student is preparing for + basic profile. */
export async function completeOnboarding(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const current = await requireUser({ allowIncompleteProfile: true });
  const raw = read(formData);
  const course = resolveTrack(await getCatalogLite(), { kind: raw.kind, board: raw.board, grade: raw.grade, stream: raw.stream, exam: raw.exam });
  const { data, errors } = parseProfile(raw, course?.track.kind === "school");
  if (!course) errors.track = "Please choose what you’re preparing for.";
  if (!data || !course || Object.keys(errors).length) return { errors, values: raw };

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(user)
      .set({
        name: data.name,
        school: data.school || null,
        city: data.city,
        state: data.state,
        ...trackColumns(course),
        onboarded: true,
        onboardedAt: current.onboardedAt ?? now,
        trackSetAt: now,
      })
      .where(eq(user.id, current.id));
    await tx.insert(trackEvents).values({ userId: current.id, type: "onboarded", fromKey: null, toKey: course.key });
    await tx.insert(userStats).values({ userId: current.id }).onConflictDoNothing();
  });
  updateTag(userTag(current.id));
  redirect("/dashboard?welcome=1");
}

/** Profile details only — the learning track changes through `changeTrackAction`. */
export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const current = await requireUser();
  const raw = read(formData);
  const { data, errors } = parseProfile(raw, current.trackKind === "school");
  if (!data || Object.keys(errors).length) return { errors, values: raw };
  await db
    .update(user)
    .set({ name: data.name, school: data.school || null, city: data.city, state: data.state })
    .where(eq(user.id, current.id));
  updateTag(userTag(current.id));
  revalidatePath("/", "layout");
  return { ok: true, values: raw };
}
