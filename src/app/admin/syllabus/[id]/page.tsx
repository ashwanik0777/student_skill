import { ArrowLeft, CircleHelp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChapterEditor, DeleteSyllabusButton, ImportChaptersDialog } from "@/components/admin/chapter-editor";
import { NoAccess, param } from "@/components/admin/misc";
import { Notice } from "@/components/admin/notice";
import { SyllabusDialog } from "@/components/admin/subject-dialog";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, SectionHeading } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSyllabusAdmin } from "@/lib/admin/catalog-queries";
import { can } from "@/lib/admin/permissions";
import { getCatalog } from "@/lib/catalog/server";
import { subjectName } from "@/lib/catalog/shared";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Chapter list" };

export default function SyllabusDetailPage({ params, searchParams }: PageProps<"/admin/syllabus/[id]">) {
  return (
    <>
      <Link href="/admin/syllabus" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Subjects & chapters
      </Link>
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        }
      >
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Detail({ params, searchParams }: { params: PageProps<"/admin/syllabus/[id]">["params"]; searchParams: PageProps<"/admin/syllabus/[id]">["searchParams"] }) {
  const staff = await requireStaff();
  if (!can(staff, "catalog.manage")) return <NoAccess permission="catalog.manage" />;
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [data, cat] = await Promise.all([getSyllabusAdmin(id), getCatalog()]);
  if (!data) notFound();
  const { syllabus, chapters, usedBy, totalQuestions, orphanQuestions } = data;

  return (
    <>
      <PageHeader
        eyebrow={subjectName(cat, syllabus.subjectSlug)}
        title={syllabus.title}
        actions={
          <>
            <Link href={`/admin/questions?syllabus=${syllabus.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <CircleHelp /> {totalQuestions} questions
            </Link>
            <ImportChaptersDialog syllabusId={syllabus.id} />
            <SyllabusDialog subjects={cat.subjects} syllabus={syllabus} />
          </>
        }
      />
      {param(sp, "created") === "1" && <Notice>Chapter list created. Add its chapters below, then attach it to a course.</Notice>}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardContent>
            <SectionHeading title="Chapters" description={`${chapters.length} chapters · ${[...new Set(chapters.map((c) => c.unit))].length} units`} />
            <ChapterEditor syllabusId={syllabus.id} chapters={chapters} />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardContent>
              <SectionHeading title="Used by" />
              {usedBy.length === 0 ? (
                <p className="text-sm text-muted-foreground">No course uses this list yet. Attach it from a course page.</p>
              ) : (
                <ul className="space-y-1.5">
                  {usedBy.map((u) => (
                    <li key={u.key}>
                      <Link href={`/admin/courses/${u.key}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                        <span className="truncate">{u.name}</span>
                        {u.borrowOnly && <Badge tone="neutral">questions only</Badge>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          {orphanQuestions > 0 && (
            <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm">
              <p className="font-semibold">{orphanQuestions} unassigned question(s)</p>
              <p className="mt-1 text-muted-foreground">They’re tagged with a chapter that no longer exists in this list, so tests don’t use them. Rename a chapter back or edit the questions.</p>
            </div>
          )}
          <Card>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                ID <span className="font-mono">{syllabus.id}</span>
                {syllabus.note ? ` · ${syllabus.note}` : ""}
              </p>
              <div className="mt-3">
                <DeleteSyllabusButton id={syllabus.id} title={syllabus.title} questions={totalQuestions} usedBy={usedBy.length} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
