import { ArrowLeft, BookOpenText, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CourseActiveToggle, CourseSubjectDialog, CourseSubjectRowActions, DeleteCourseButton, WeeklyPartsEditor } from "@/components/admin/course-dialogs";
import { ActionForm, Check, FieldWithError } from "@/components/admin/form-dialog";
import { NoAccess, param } from "@/components/admin/misc";
import { Notice } from "@/components/admin/notice";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, SectionHeading } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { updateCourseAction } from "@/lib/actions/catalog";
import { getCourseAdmin } from "@/lib/admin/catalog-queries";
import { can } from "@/lib/admin/permissions";
import { getCatalog } from "@/lib/catalog/server";
import { subjectName } from "@/lib/catalog/shared";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Course" };

export default function CourseDetailPage({ params, searchParams }: PageProps<"/admin/courses/[key]">) {
  return (
    <>
      <Link href="/admin/courses" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Courses
      </Link>
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-10 w-80" />
            <div className="grid gap-6 xl:grid-cols-2">
              <Skeleton className="h-96 rounded-2xl" />
              <Skeleton className="h-96 rounded-2xl" />
            </div>
          </div>
        }
      >
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Detail({ params, searchParams }: { params: PageProps<"/admin/courses/[key]">["params"]; searchParams: PageProps<"/admin/courses/[key]">["searchParams"] }) {
  const staff = await requireStaff();
  if (!can(staff, "catalog.manage")) return <NoAccess permission="catalog.manage" />;
  const [{ key }, sp] = await Promise.all([params, searchParams]);
  const [data, cat] = await Promise.all([getCourseAdmin(key), getCatalog()]);
  if (!data) notFound();
  const { config, students, subjects } = data;
  const syllabusTitle = (id: string) => cat.syllabi.find((s) => s.id === id)?.title ?? id;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{config.key}</span>
            {config.active ? <Badge tone="success">On</Badge> : <Badge tone="neutral">Off</Badge>}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3.5" /> {students} students
            </span>
          </span>
        }
        title={config.name}
        actions={<CourseActiveToggle courseKey={config.key} name={config.name} active={config.active} disabled={subjects.length === 0} />}
      />
      {param(sp, "created") === "1" && <Notice>Course created. Check its subjects and the Sunday test mix, then switch it on.</Notice>}

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardContent>
              <SectionHeading title="Subjects" description={`${subjects.length} subjects · daily test per subject`} action={<CourseSubjectDialog courseKey={config.key} subjects={cat.subjects} syllabi={cat.syllabi} existingSlugs={subjects.map((s) => s.slug)} />} />
              {subjects.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border-strong px-4 py-8 text-center text-sm text-muted-foreground">Add the subjects this course teaches. Each one needs a chapter list.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {subjects.map((s, i) => (
                    <li key={s.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {subjectName(cat, s.slug)}
                          {s.strict && <Badge tone="outline">strict</Badge>}
                          {s.questions < 5 && <Badge tone="warning">{s.questions} Qs</Badge>}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {s.chapters} chapters · {s.questions} bank questions
                        </p>
                        <p className="mt-1 flex flex-wrap gap-1.5">
                          {s.syllabusIds.map((id) => (
                            <Link key={id} href={`/admin/syllabus/${id}`} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] hover:border-border-strong">
                              <BookOpenText className="size-3" /> {syllabusTitle(id)}
                            </Link>
                          ))}
                          {s.borrowIds.map((id) => (
                            <Link key={id} href={`/admin/syllabus/${id}`} className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-border-strong">
                              + Qs: {syllabusTitle(id)}
                            </Link>
                          ))}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <CourseSubjectDialog courseKey={config.key} subjects={cat.subjects} syllabi={cat.syllabi} existingSlugs={subjects.map((x) => x.slug)} row={s} />
                        <CourseSubjectRowActions row={s} first={i === 0} last={i === subjects.length - 1} name={subjectName(cat, s.slug)} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionHeading title="Sunday test mix" description={`${config.weekly.questions} questions · ${Math.round(config.weekly.durationSec / 60)} minutes`} />
              <WeeklyPartsEditor courseKey={config.key} parts={config.weekly.parts} subjects={config.subjects} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent>
            <SectionHeading title="Details & test settings" />
            <ActionForm action={updateCourseAction} submitLabel="Save course" confirm={{ title: "Save course details?", description: "Students in this course see the new name and settings right away.", confirmLabel: "Save" }} footer={<DeleteCourseButton courseKey={config.key} name={config.name} students={students} />}>
              <input type="hidden" name="key" value={config.key} />
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <FieldWithError name="name" label="Name">
                  <Input id="name" name="name" defaultValue={config.name} />
                </FieldWithError>
                <FieldWithError name="short" label="Short name">
                  <Input id="short" name="short" defaultValue={config.short} />
                </FieldWithError>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldWithError name="cohortKey" label="Cohort key" hint="Courses with the same key share a leaderboard & forum.">
                  <Input id="cohortKey" name="cohortKey" defaultValue={config.cohortKey} />
                </FieldWithError>
                <FieldWithError name="cohortLabel" label="Cohort label">
                  <Input id="cohortLabel" name="cohortLabel" defaultValue={config.cohortLabel} />
                </FieldWithError>
              </div>
              <FieldWithError name="audience" label="AI audience" hint="Completes the sentence “Create questions for …”.">
                <Textarea id="audience" name="audience" defaultValue={config.audience} className="min-h-20" />
              </FieldWithError>
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldWithError name="dailyQuestions" label="Daily test questions">
                  <Input id="dailyQuestions" name="dailyQuestions" type="number" min={3} max={50} defaultValue={config.daily.questions} />
                </FieldWithError>
                <FieldWithError name="dailyMinutes" label="Daily test minutes">
                  <Input id="dailyMinutes" name="dailyMinutes" type="number" min={1} max={240} defaultValue={Math.round(config.daily.durationSec / 60)} />
                </FieldWithError>
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem]">
                <FieldWithError name="weeklyTitle" label="Sunday test title">
                  <Input id="weeklyTitle" name="weeklyTitle" defaultValue={config.weekly.title} />
                </FieldWithError>
                <FieldWithError name="weeklyLabel" label="Sunday test label">
                  <Input id="weeklyLabel" name="weeklyLabel" defaultValue={config.weekly.label} />
                </FieldWithError>
                <FieldWithError name="weeklyMinutes" label="Minutes">
                  <Input id="weeklyMinutes" name="weeklyMinutes" type="number" min={5} max={300} defaultValue={Math.round(config.weekly.durationSec / 60)} />
                </FieldWithError>
              </div>
              <Check name="active" label="Course is on" hint="Students can pick it at sign-up and when moving up." defaultChecked={config.active} />
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
