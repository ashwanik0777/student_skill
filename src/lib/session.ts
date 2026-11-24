import "server-only";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { isStaff, type Role, type StaffRole } from "@/lib/admin/permissions";
import { auth } from "@/lib/auth";
import { getCourseConfig } from "@/lib/catalog/server";
import { trackFromUser, type CourseConfig, type Track } from "@/lib/catalog/shared";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

/** Data Access Layer: the single place that reads the session. Deduplicated per request. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  school: string | null;
  city: string | null;
  state: string | null;
  trackKind: "school" | "exam" | null;
  board: string | null;
  grade: number | null;
  stream: string | null;
  exam: string | null;
  cohort: string | null;
  onboarded: boolean;
  onboardedAt: Date | null;
  trackSetAt: Date | null;
  lastPromotedAt: Date | null;
  createdAt: Date;
  role: Role;
  permissions: string[];
};

export type Staff = CurrentUser & { role: StaffRole };

/** Cache tag for one user's row. Every Server Action that writes the row calls `updateTag(userTag(id))`. */
export function userTag(id: string) {
  return `user:${id}`;
}

/**
 * The user row behind a session, cached across requests so most page loads skip this database round trip.
 * Writes in our actions expire it immediately (see `userTag`); anything else (e.g. the admin CLI) shows up within
 * about a minute.
 */
async function loadUserRow(id: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(userTag(id));
  const row = await db.query.user.findFirst({
    where: eq(user.id, id),
    columns: {
      id: true,
      name: true,
      email: true,
      image: true,
      school: true,
      city: true,
      state: true,
      trackKind: true,
      board: true,
      grade: true,
      stream: true,
      exam: true,
      cohort: true,
      onboarded: true,
      onboardedAt: true,
      trackSetAt: true,
      lastPromotedAt: true,
      createdAt: true,
      role: true,
      permissions: true,
      suspendedAt: true,
      sessionsRevokedAt: true,
    },
  });
  return row ?? null;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const s = await getSession();
  if (!s) return null;
  const row = await loadUserRow(s.user.id);
  // Suspended accounts are treated as signed out everywhere (sign-in itself is blocked in src/lib/auth.ts).
  if (!row || row.suspendedAt) return null;
  // Revocation is checked against the user row, so it applies instantly despite Better Auth's cookie cache.
  if (row.sessionsRevokedAt && new Date(s.session.createdAt) < row.sessionsRevokedAt) return null;
  return row;
});

/** Use in every protected Server Component, Server Action and Route Handler. */
export async function requireUser(opts: { allowIncompleteProfile?: boolean } = {}): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) redirect("/sign-in");
  if (!opts.allowIncompleteProfile && (!current.onboarded || !trackFromUser(current))) {
    // Staff accounts don't need a course; send them to their own area instead of onboarding.
    redirect(isStaff(current) ? "/admin" : "/onboarding");
  }
  return current;
}

/** Admin area pages: signed-in staff only. Students get a plain 404 so the area isn't advertised. */
export async function requireStaff(): Promise<Staff> {
  const current = await getCurrentUser();
  if (!current) redirect("/sign-in?next=/admin");
  if (!isStaff(current)) notFound();
  return current as Staff;
}

/** Server Actions: the signed-in staff member, or null (never redirects, so actions can return an error). */
export async function getStaff(): Promise<Staff | null> {
  const current = await getCurrentUser();
  return current && isStaff(current) ? (current as Staff) : null;
}

export type Learner = { user: CurrentUser; track: Track; config: CourseConfig };

/** The signed-in student together with what they're preparing for. Redirects to onboarding if the track is missing. */
export async function requireLearner(): Promise<Learner> {
  const current = await requireUser();
  const track = trackFromUser(current)!;
  const config = await getCourseConfig(track);
  // The course was removed from the catalog: ask the student to pick again.
  if (!config) redirect("/onboarding");
  return { user: current, track, config };
}

/** For Route Handlers: returns null instead of redirecting. */
export async function getApiUser(): Promise<CurrentUser | null> {
  return getCurrentUser();
}

export async function getApiLearner(): Promise<Learner | null> {
  const current = await getCurrentUser();
  if (!current) return null;
  const track = trackFromUser(current);
  const config = await getCourseConfig(track);
  if (!track || !config) return null;
  return { user: current, track, config };
}
