import { BookOpenText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/misc";
import { TableSkeleton } from "@/components/admin/skeletons";
import { DeleteSubjectButton, SubjectDialog, SyllabusDialog } from "@/components/admin/subject-dialog";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, SectionHeading } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listSyllabiAdmin, subjectUsage } from "@/lib/admin/catalog-queries";
import { can } from "@/lib/admin/permissions";
import { iconFor, toneFor } from "@/lib/catalog/icons";
import { getCatalog } from "@/lib/catalog/server";
import { requireStaff } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Subjects & chapters" };

export default function SyllabusPage() {
  return (
    <>
      <PageHeader title="Subjects & chapters" />
      <Suspense fallback={<TableSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const staff = await requireStaff();
  if (!can(staff, "catalog.manage")) return <NoAccess permission="catalog.manage" />;
  const [cat, syllabi, usage] = await Promise.all([getCatalog(), listSyllabiAdmin(), subjectUsage()]);
  const bySubject = new Map<string, typeof syllabi>();
  for (const s of syllabi) bySubject.set(s.subjectSlug, [...(bySubject.get(s.subjectSlug) ?? []), s]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <SectionHeading title="Subjects" description={`${cat.subjects.length} subjects`} action={<SubjectDialog />} />
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {cat.subjects.map((s) => {
              const Icon = iconFor(s.icon);
              const u = usage.get(s.slug);
              return (
                <li key={s.slug} className="flex min-w-0 items-center gap-3 rounded-xl border border-border p-3">
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", toneFor(s.tone).soft)}>
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      {s.name}
                      {!s.active && <Badge tone="neutral">Inactive</Badge>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.short} · {u?.courses ?? 0} courses · {u?.syllabi ?? 0} lists · {u?.questions ?? 0} Qs
                    </p>
                  </div>
                  <SubjectDialog subject={s} />
                  <DeleteSubjectButton subject={s} />
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <SectionHeading title="Chapter lists" description={`${syllabi.length} lists · shared across courses`} action={<SyllabusDialog subjects={cat.subjects} />} />
          {syllabi.length === 0 ? (
            <EmptyState icon={BookOpenText} title="No chapter lists yet" description="Create one per board/class/subject, then attach it to courses." />
          ) : (
            <div className="space-y-6">
              {cat.subjects
                .filter((s) => bySubject.has(s.slug))
                .map((s) => (
                  <div key={s.slug}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.name}</p>
                    <ul className="divide-y divide-border rounded-xl border border-border">
                      {bySubject.get(s.slug)!.map((sy) => (
                        <li key={sy.id} className="relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60">
                          <div className="min-w-0 flex-1">
                            <Link href={`/admin/syllabus/${sy.id}`} className="block truncate text-sm font-medium after:absolute after:inset-0">
                              {sy.title}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              <span className="font-mono">{sy.id}</span>
                              {sy.note ? ` · ${sy.note}` : ""}
                            </p>
                          </div>
                          <div className="hidden shrink-0 gap-4 text-xs text-muted-foreground tabular sm:flex">
                            <span>{sy.chapters.length} chapters</span>
                            <span>{sy.questions} questions</span>
                            <span>{sy.usedBy.length} courses</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
