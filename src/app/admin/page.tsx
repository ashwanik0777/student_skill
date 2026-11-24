import { ArrowRight, ClipboardCheck, Megaphone, MessagesSquare, ScrollText, ShieldCheck, Target, UserCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { canSee, ADMIN_NAV } from "@/components/admin/nav-items";
import { OverviewSkeleton } from "@/components/admin/skeletons";
import { BarList, ColumnChart, StatTile, formatCount, type ColumnPoint } from "@/components/admin/stats";
import { PageHeader } from "@/components/app-shell/page-header";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { can } from "@/lib/admin/permissions";
import { getAdminOverview, type DailyPoint } from "@/lib/admin/queries";
import { getCatalogLite } from "@/lib/catalog/server";
import { cohortLabelFromKey } from "@/lib/catalog/shared";
import { requireStaff, type Staff } from "@/lib/session";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

function series(daily: DailyPoint[], pick: (d: DailyPoint) => number): ColumnPoint[] {
  return daily.map((d) => ({ key: d.day, label: dayLabel.format(new Date(`${d.day}T00:00:00Z`)), value: pick(d) }));
}

export default function AdminHomePage() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const staff = await requireStaff();
  if (!can(staff, "analytics.view")) return <Welcome staff={staff} />;
  const [o, cat] = await Promise.all([getAdminOverview(), getCatalogLite()]);
  const first = staff.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Hello, ${first}`}
        actions={
          can(staff, "students.view") ? (
            <Link href="/admin/students" className={buttonVariants({ variant: "outline" })}>
              <Users /> All students
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile label="Students" value={formatCount(o.students.total)} icon={Users} delta={{ value: o.students.newWeek, label: "this week" }} />
        <StatTile label="Active today" value={formatCount(o.activity.activeToday)} icon={UserCheck} hint={`${formatCount(o.activity.activeWeek)} active in the last 7 days`} />
        <StatTile label="Tests today" value={formatCount(o.activity.testsToday)} icon={ClipboardCheck} hint={`${formatCount(o.activity.testsWeek)} in the last 7 days`} />
        <StatTile
          label="Average score"
          value={o.activity.avgScore === null ? "—" : `${o.activity.avgScore}%`}
          icon={Target}
          hint="Completed tests, last 30 days"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tests completed per day</CardTitle>
            <CardDescription>Last 30 days, India time</CardDescription>
          </CardHeader>
          <CardContent>
            <ColumnChart data={series(o.daily, (d) => d.tests)} unit={["test", "tests"]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>New sign-ups per day</CardTitle>
            <CardDescription>Last 30 days, India time</CardDescription>
          </CardHeader>
          <CardContent>
            <ColumnChart data={series(o.daily, (d) => d.signups)} unit={["sign-up", "sign-ups"]} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Students by course</CardTitle>
            <CardDescription>
              {formatCount(o.students.onboarded)} of {formatCount(o.students.total)} have picked a course
            </CardDescription>
          </CardHeader>
          <CardContent>
            {o.cohorts.length ? (
              <BarList items={o.cohorts.map((c) => ({ key: c.cohort, label: cohortLabelFromKey(cat, c.cohort), value: c.students }))} />
            ) : (
              <p className="text-sm text-muted-foreground">No students have picked a course yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Newest students</CardTitle>
            <CardDescription>{formatCount(o.students.newToday)} joined today</CardDescription>
          </CardHeader>
          <CardContent className="pt-3 sm:pt-3">
            {o.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sign-ups yet.</p>
            ) : (
              <ul className="-mx-2">
                {o.recent.map((s) => {
                  const row = (
                    <>
                      <Avatar name={s.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{s.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{s.onboarded ? cohortLabelFromKey(cat, s.cohort) : "Hasn’t picked a course"}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(s.createdAt)}</span>
                    </>
                  );
                  return (
                    <li key={s.id}>
                      {can(staff, "students.view") ? (
                        <Link href={`/admin/students/${s.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2">
                          {row}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 px-2 py-2">{row}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 2xl:col-span-1">
          <CardHeader>
            <CardTitle>This week</CardTitle>
            <CardDescription>Community and account health</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3">
              {[
                { label: "Doubts asked", value: o.community.postsWeek, href: "/admin/community", allowed: can(staff, "community.moderate") },
                { label: "Answers posted", value: o.community.repliesWeek, href: "/admin/community", allowed: can(staff, "community.moderate") },
                { label: "Not set up yet", value: o.students.total - o.students.onboarded, href: "/admin/students?status=pending", allowed: can(staff, "students.view") },
                { label: "Suspended", value: o.students.suspended, href: "/admin/students?status=suspended", allowed: can(staff, "students.view") },
              ].map((item) => {
                const body = (
                  <>
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="mt-1 text-xl font-semibold">{formatCount(item.value)}</dd>
                  </>
                );
                return item.allowed ? (
                  <Link key={item.label} href={item.href} className="rounded-xl border border-border bg-background p-3.5 transition-colors hover:border-border-strong">
                    {body}
                  </Link>
                ) : (
                  <div key={item.label} className="rounded-xl border border-border bg-background p-3.5">
                    {body}
                  </div>
                );
              })}
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

const SECTION_ICON = { "/admin/students": Users, "/admin/community": MessagesSquare, "/admin/announcements": Megaphone, "/admin/staff": ShieldCheck, "/admin/audit": ScrollText } as const;
const SECTION_TEXT: Record<string, string> = {
  "/admin/students": "Look up students, their course and progress.",
  "/admin/community": "Review doubts and remove anything that breaks the rules.",
  "/admin/announcements": "Post notices to student dashboards.",
  "/admin/courses": "Boards, exams, courses and their test settings.",
  "/admin/syllabus": "Subjects and chapter lists.",
  "/admin/questions": "The fallback question bank.",
  "/admin/staff": "Add sub-admins and choose what they can do.",
  "/admin/settings": "Course-change rules and sign-ups.",
  "/admin/audit": "See every action taken by staff.",
};

/** Staff without analytics access land here: a short list of the sections they can open. */
function Welcome({ staff }: { staff: Staff }) {
  const sections = ADMIN_NAV.filter((item) => item.href !== "/admin" && canSee(staff, item));
  return (
    <>
      <PageHeader title={`Welcome, ${staff.name.split(" ")[0]}`} />
      {sections.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-muted-foreground">
          You don’t have any permissions yet. Ask an admin to give you access.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((item) => {
            const Icon = SECTION_ICON[item.href as keyof typeof SECTION_ICON] ?? item.icon;
            return (
              <Link key={item.href} href={item.href} className="group rounded-2xl border border-border bg-surface p-5 shadow-soft transition-colors hover:border-border-strong">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-ink">
                  <Icon className="size-5" />
                </span>
                <p className="mt-4 flex items-center gap-1.5 font-semibold">
                  {item.label}
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{SECTION_TEXT[item.href]}</p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
