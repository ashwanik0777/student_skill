import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilterBar } from "@/components/admin/filters";
import { NoAccess, Pagination, param } from "@/components/admin/misc";
import { TableSkeleton } from "@/components/admin/skeletons";
import { formatCount } from "@/components/admin/stats";
import { StudentStatusBadge, courseOf, lastActiveLabel } from "@/components/admin/student-bits";
import { PageHeader } from "@/components/app-shell/page-header";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/admin/permissions";
import { listStudents, type StudentSort, type StudentStatus } from "@/lib/admin/queries";
import { getCatalogLite } from "@/lib/catalog/server";
import { listCohorts } from "@/lib/catalog/shared";
import { requireStaff } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Students" };

const STATUSES: StudentStatus[] = ["all", "active", "pending", "suspended"];
const SORTS: StudentSort[] = ["newest", "xp", "active"];

export default function StudentsPage({ searchParams }: PageProps<"/admin/students">) {
  return (
    <>
      <PageHeader title="Students" />
      <Suspense fallback={<TableSkeleton />}>
        <StudentsTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function StudentsTable({ searchParams }: { searchParams: PageProps<"/admin/students">["searchParams"] }) {
  const staff = await requireStaff();
  if (!can(staff, "students.view")) return <NoAccess permission="students.view" />;

  const [sp, cat] = await Promise.all([searchParams, getCatalogLite()]);
  const cohorts = listCohorts(cat);
  const q = param(sp, "q");
  const status = (STATUSES as string[]).includes(param(sp, "status") ?? "") ? (param(sp, "status") as StudentStatus) : "all";
  const cohort = cohorts.some((c) => c.key === param(sp, "course")) ? param(sp, "course") : undefined;
  const sort = (SORTS as string[]).includes(param(sp, "sort") ?? "") ? (param(sp, "sort") as StudentSort) : "newest";
  const page = Number(param(sp, "page") ?? 1);

  const data = await listStudents({ q, status, cohort, sort, page });
  const params = { q, status: status === "all" ? undefined : status, course: cohort, sort: sort === "newest" ? undefined : sort };

  return (
    <>
      <FilterBar
        action="/admin/students"
        search={{ name: "q", placeholder: "Search by name or email", value: q }}
        selects={[
          {
            name: "status",
            label: "Status",
            value: params.status,
            options: [
              { value: "", label: "All students" },
              { value: "active", label: "Active" },
              { value: "pending", label: "Not set up yet" },
              { value: "suspended", label: "Suspended" },
            ],
          },
          {
            name: "course",
            label: "Course",
            value: cohort,
            options: [{ value: "", label: "All courses" }, ...cohorts.map((c) => ({ value: c.key, label: c.label }))],
          },
          {
            name: "sort",
            label: "Sort",
            value: params.sort,
            options: [
              { value: "", label: "Newest first" },
              { value: "xp", label: "Most XP" },
              { value: "active", label: "Recently active" },
            ],
          },
        ]}
      />

      {data.rows.length === 0 ? (
        <EmptyState icon={Users} title="No students found" description={q || params.status || cohort ? "Try a different search or clear the filters." : "Students appear here as soon as they sign up."} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface shadow-soft md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-2/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 text-right font-medium">XP</th>
                  <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Tests</th>
                  <th className="hidden px-4 py-3 text-right font-medium xl:table-cell">Streak</th>
                  <th className="px-4 py-3 font-medium">Last active</th>
                  <th className="hidden px-4 py-3 font-medium xl:table-cell">Joined</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((s) => (
                  <tr key={s.id} className="relative border-b border-border transition-colors last:border-0 hover:bg-surface-2/50">
                    <td className="max-w-0 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={s.name} src={s.image} size="sm" />
                        <div className="min-w-0">
                          <Link href={`/admin/students/${s.id}`} className="block truncate font-medium after:absolute after:inset-0">
                            {s.name}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{courseOf(cat, s) ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular">{formatCount(s.xp)}</td>
                    <td className="hidden px-4 py-3 text-right tabular lg:table-cell">{formatCount(s.tests)}</td>
                    <td className="hidden px-4 py-3 text-right tabular xl:table-cell">{s.streak}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{lastActiveLabel(s.lastActiveDay)}</td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground xl:table-cell">{formatDate(s.createdAt, { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-3">
                      <StudentStatusBadge suspended={!!s.suspendedAt} onboarded={s.onboarded} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone cards */}
          <ul className="space-y-2.5 md:hidden">
            {data.rows.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/students/${s.id}`} className="block rounded-2xl border border-border bg-surface p-4 shadow-soft">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} src={s.image} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{s.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                    </div>
                    <StudentStatusBadge suspended={!!s.suspendedAt} onboarded={s.onboarded} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{courseOf(cat, s) ?? "No course"}</span>
                    <span className="tabular">{formatCount(s.xp)} XP</span>
                    <span className="tabular">{formatCount(s.tests)} tests</span>
                    <span>Active: {lastActiveLabel(s.lastActiveDay)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <Pagination page={data.page} pages={data.pages} total={data.total} basePath="/admin/students" params={params} noun={["student", "students"]} />
    </>
  );
}
