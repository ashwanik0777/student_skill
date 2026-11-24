import { ScrollText } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { FilterBar } from "@/components/admin/filters";
import { NoAccess, Pagination, param } from "@/components/admin/misc";
import { TableSkeleton } from "@/components/admin/skeletons";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { auditLabel } from "@/lib/admin/audit-actions";
import { can } from "@/lib/admin/permissions";
import { listAudit, listAuditActors } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log" };

const AREAS = [
  { value: "student", label: "Student accounts" },
  { value: "staff", label: "Staff & permissions" },
  { value: "post", label: "Doubts removed" },
  { value: "reply", label: "Answers removed" },
  { value: "announcement", label: "Announcements" },
  { value: "course", label: "Courses" },
  { value: "syllabus", label: "Chapter lists" },
  { value: "chapter", label: "Chapters" },
  { value: "subject", label: "Subjects" },
  { value: "option", label: "Boards, streams & exams" },
  { value: "question", label: "Question bank" },
  { value: "settings", label: "Settings" },
];

export default function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  return (
    <>
      <PageHeader title="Audit log" />
      <Suspense fallback={<TableSkeleton />}>
        <AuditTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function reasonOf(meta: Record<string, unknown> | null) {
  const r = meta?.reason;
  return typeof r === "string" && r ? r : null;
}

async function AuditTable({ searchParams }: { searchParams: PageProps<"/admin/audit">["searchParams"] }) {
  const staff = await requireStaff();
  if (!can(staff, "audit.view")) return <NoAccess permission="audit.view" />;
  const sp = await searchParams;
  const actor = param(sp, "by");
  const area = AREAS.some((a) => a.value === param(sp, "area")) ? param(sp, "area") : undefined;
  const [data, actors] = await Promise.all([
    listAudit({ actor, action: area ? `${area}.` : undefined, page: Number(param(sp, "page") ?? 1) }),
    listAuditActors(),
  ]);

  return (
    <>
      <FilterBar
        action="/admin/audit"
        selects={[
          {
            name: "by",
            label: "Staff member",
            value: actor,
            options: [{ value: "", label: "Everyone" }, ...actors.map((a) => ({ value: a.id ?? "", label: a.name }))],
          },
          { name: "area", label: "Area", value: area, options: [{ value: "", label: "All actions" }, ...AREAS] },
        ]}
      />
      {data.rows.length === 0 ? (
        <EmptyState icon={ScrollText} title="No actions yet" description="Staff actions such as suspending accounts or removing doubts are recorded here." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          <ul className="divide-y divide-border">
            {data.rows.map((e) => {
              const reason = reasonOf(e.meta);
              return (
                <li key={e.id} className="grid gap-1 px-4 py-3.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                  <time className="text-xs text-muted-foreground sm:pt-0.5" dateTime={e.createdAt.toISOString()}>
                    {formatDate(e.createdAt, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </time>
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{e.actorName}</span>
                      <span className="text-muted-foreground"> · {auditLabel(e.action)}</span>
                    </p>
                    <p className="mt-0.5 break-words text-sm text-muted-foreground">{e.summary}</p>
                    {reason && <p className="mt-1 text-xs text-muted-foreground">Reason: {reason}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <Pagination page={data.page} pages={data.pages} total={data.total} basePath="/admin/audit" params={{ by: actor, area }} noun={["entry", "entries"]} />
    </>
  );
}
