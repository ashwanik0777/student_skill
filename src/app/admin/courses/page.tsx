import { GraduationCap, Settings2, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CourseActiveToggle, CreateCourseDialog } from "@/components/admin/course-dialogs";
import { NoAccess } from "@/components/admin/misc";
import { TableSkeleton } from "@/components/admin/skeletons";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { bankCoverage, listCoursesAdmin } from "@/lib/admin/catalog-queries";
import { can } from "@/lib/admin/permissions";
import { getCatalog } from "@/lib/catalog/server";
import { optionName, subjectName, type CatalogData } from "@/lib/catalog/shared";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Courses" };

export default function CoursesPage() {
  return (
    <>
      <PageHeader
        title="Courses"
        actions={
          <>
            <Link href="/admin/courses/options" className={buttonVariants({ variant: "outline" })}>
              <Settings2 /> Boards, streams & exams
            </Link>
            <CreateCourseDialog />
          </>
        }
      />
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <CourseList />
      </Suspense>
    </>
  );
}

type Row = Awaited<ReturnType<typeof listCoursesAdmin>>[number];

function CourseTable({ rows, cat }: { rows: Row[]; cat: CatalogData }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-2/60 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Course</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Subjects</th>
            <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Students</th>
            <th className="hidden px-4 py-3 font-medium xl:table-cell">Daily · Sunday</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.key} className="relative border-b border-border transition-colors last:border-0 hover:bg-surface-2/50">
              <td className="max-w-0 px-4 py-3">
                <Link href={`/admin/courses/${c.key}`} className="block truncate font-medium after:absolute after:inset-0">
                  {c.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  <span className="font-mono">{c.key}</span> · {c.cohortLabel}
                </p>
              </td>
              <td className="hidden max-w-0 px-4 py-3 text-muted-foreground md:table-cell">
                <p className="truncate">{c.subjects.length ? c.subjects.map((s) => subjectName(cat, s.slug)).join(", ") : "—"}</p>
              </td>
              <td className="hidden px-4 py-3 text-right tabular lg:table-cell">{c.students}</td>
              <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground xl:table-cell">
                {c.daily.questions} Q · {Math.round(c.daily.durationSec / 60)} min · {c.weekly.questions} Q
              </td>
              <td className="relative z-10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CourseActiveToggle courseKey={c.key} name={c.name} active={c.active} disabled={c.subjects.length === 0} />
                  {c.subjects.length === 0 && <Badge tone="warning">No subjects</Badge>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function CourseList() {
  const staff = await requireStaff();
  if (!can(staff, "catalog.manage")) return <NoAccess permission="catalog.manage" />;
  const [rows, cat, low] = await Promise.all([listCoursesAdmin(), getCatalog(), bankCoverage()]);
  if (rows.length === 0) return <EmptyState icon={GraduationCap} title="No courses yet" description="Add a course for each board & class or competitive exam." />;

  const school = rows.filter((c) => c.track.kind === "school");
  const exams = rows.filter((c) => c.track.kind === "exam");
  const boards = [...new Set(school.map((c) => (c.track.kind === "school" ? c.track.board : "")))];

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Courses", value: rows.length, hint: `${rows.filter((c) => c.active).length} switched on` },
          { label: "Students placed", value: rows.reduce((n, c) => n + c.students, 0), hint: "across all courses" },
          { label: "Low on questions", value: low.length, hint: low.length ? "subjects with < 5 bank questions" : "every subject has ≥ 5" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.hint}</p>
          </div>
        ))}
      </div>

      {low.length > 0 && (
        <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <TriangleAlert className="size-4 text-warning" /> Subjects that may run out of fallback questions when AI is unavailable
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {low.slice(0, 12).map((l) => (
              <li key={`${l.course}-${l.subject}`}>
                <Link href={`/admin/courses/${l.course}`} className="rounded-full border border-warning/40 bg-surface px-2.5 py-0.5 text-xs hover:border-warning">
                  {l.courseName} · {subjectName(cat, l.subject)} ({l.usable})
                </Link>
              </li>
            ))}
            {low.length > 12 && <li className="text-xs text-muted-foreground">+{low.length - 12} more</li>}
          </ul>
        </div>
      )}

      {boards.map((board) => (
        <section key={board}>
          <h2 className="mb-3 text-lg font-semibold">{optionName(cat, "board", board)}</h2>
          <CourseTable rows={school.filter((c) => c.track.kind === "school" && c.track.board === board)} cat={cat} />
        </section>
      ))}
      {exams.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Competitive exams</h2>
          <CourseTable rows={exams} cat={cat} />
        </section>
      )}
    </div>
  );
}
