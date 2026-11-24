import { ArrowLeft, Award, Flame, LaptopMinimal, Sparkles, Target } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/misc";
import { formatCount } from "@/components/admin/stats";
import { StudentActions } from "@/components/admin/student-actions";
import { StudentStatusBadge, lastActiveLabel } from "@/components/admin/student-bits";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { can, ROLE_LABEL } from "@/lib/admin/permissions";
import { getStudentDetail } from "@/lib/admin/queries";
import { getCatalogLite } from "@/lib/catalog/server";
import { cohortLabelFromKey, courseForTrack, subjectName, trackFromUser } from "@/lib/catalog/shared";
import { levelInfo } from "@/lib/gamification";
import { requireStaff } from "@/lib/session";
import { formatDate, scoreTone } from "@/lib/utils";

export const metadata: Metadata = { title: "Student" };

const EVENT_LABEL = { onboarded: "Picked a course", corrected: "Corrected course", promoted: "Moved up", exam_switched: "Switched exam" } as const;
const END_LABEL = { submitted: null, time_up: "Time up", tab_switch: "Left the test", offline: "Offline" } as const;

export default function StudentDetailPage({ params }: PageProps<"/admin/students/[id]">) {
  return (
    <>
      <Link href="/admin/students" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All students
      </Link>
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-20 rounded-2xl" />
            <div className="grid gap-6 lg:grid-cols-3">
              <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
              <Skeleton className="h-96 rounded-2xl" />
            </div>
          </div>
        }
      >
        <StudentDetail params={params} />
      </Suspense>
    </>
  );
}

async function StudentDetail({ params }: { params: PageProps<"/admin/students/[id]">["params"] }) {
  const staff = await requireStaff();
  if (!can(staff, "students.view")) return <NoAccess permission="students.view" />;
  const { id } = await params;
  const [detail, cat] = await Promise.all([getStudentDetail(id), getCatalogLite()]);
  if (!detail) notFound();

  const { profile, stats, recentAttempts, events, badges, sessions } = detail;
  const course = courseForTrack(cat, trackFromUser(profile));
  const level = levelInfo(stats?.xp ?? 0);
  const accuracy = stats && stats.questionsAnswered > 0 ? Math.round((stats.correctAnswers / stats.questionsAnswered) * 100) : null;
  const manageable = profile.role === "student" && can(staff, "students.manage") && profile.id !== staff.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={profile.name} src={profile.image} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight">{profile.name}</h1>
              <StudentStatusBadge suspended={!!profile.suspendedAt} onboarded={profile.onboarded} />
              {profile.role !== "student" && <Badge tone="brand">{ROLE_LABEL[profile.role]}</Badge>}
            </div>
            <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
            <p className="mt-1 text-sm text-muted-foreground">{course ? course.name : "Hasn’t picked a course yet"}</p>
          </div>
        </div>
        {manageable && <StudentActions id={profile.id} name={profile.name} email={profile.email} suspended={!!profile.suspendedAt} />}
      </div>

      {profile.suspendedAt && (
        <div className="rounded-2xl border border-danger/20 bg-danger-soft p-4 text-sm">
          <p className="font-medium text-danger">Suspended {formatDate(profile.suspendedAt, { day: "numeric", month: "short", year: "numeric" })}</p>
          <p className="mt-0.5 text-foreground/80">{profile.suspendedReason ?? "No reason was recorded."}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { icon: Sparkles, label: `Level ${level.level}`, value: `${formatCount(stats?.xp ?? 0)} XP` },
              { icon: Target, label: "Accuracy", value: accuracy === null ? "—" : `${accuracy}%` },
              { icon: Flame, label: "Streak", value: `${stats?.currentStreak ?? 0} days`, hint: `Best ${stats?.longestStreak ?? 0}` },
              { icon: Award, label: "Badges", value: formatCount(badges) },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <s.icon className="size-3.5" /> {s.label}
                </p>
                <p className="mt-1.5 text-xl font-semibold">{s.value}</p>
                {s.hint && <p className="text-xs text-muted-foreground">{s.hint}</p>}
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent tests</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 sm:pt-3">
              {recentAttempts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No completed tests yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {recentAttempts.map((a) => {
                    const end = a.endReason ? END_LABEL[a.endReason] : null;
                    return (
                      <li key={a.id} className="flex items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{a.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {a.subject === "mixed" ? "Mixed subjects" : subjectName(cat, a.subject)} ·{" "}
                            {a.completedAt ? formatDate(a.completedAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : ""}
                            {end && ` · ${end}`}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground tabular">
                          {a.correct}/{a.total}
                        </span>
                        <span className={`w-12 shrink-0 text-right text-sm font-semibold tabular ${scoreTone(a.score ?? 0).text}`}>{a.score ?? 0}%</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                {[
                  ["School", profile.school ?? "—"],
                  ["Location", [profile.city, profile.state].filter(Boolean).join(", ") || "—"],
                  ["Cohort", profile.cohort ? cohortLabelFromKey(cat, profile.cohort) : "—"],
                  ["Joined", formatDate(profile.createdAt, { day: "numeric", month: "short", year: "numeric" })],
                  ["Last test", lastActiveLabel(stats?.lastActiveDay ?? null)],
                  ["Tests completed", formatCount(stats?.testsCompleted ?? 0)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="truncate text-right font-medium">{v}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Signed in on</dt>
                  <dd className="flex items-center gap-1.5 font-medium">
                    <LaptopMinimal className="size-3.5 text-muted-foreground" />
                    {sessions} {sessions === 1 ? "device" : "devices"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course history</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No course changes yet.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {events.map((e) => (
                    <li key={e.id} className="relative">
                      <span aria-hidden className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-surface bg-brand" />
                      <p className="text-sm font-medium">{EVENT_LABEL[e.type]}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.fromKey ? `${e.fromKey} → ${e.toKey}` : e.toKey} · {formatDate(e.createdAt, { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
