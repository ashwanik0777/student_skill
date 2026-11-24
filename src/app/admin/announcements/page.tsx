import { CircleCheck, Info, Megaphone, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AnnouncementActions } from "@/components/admin/announcement-actions";
import { NewAnnouncementButton } from "@/components/admin/announcement-form";
import { NoAccess } from "@/components/admin/misc";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { can } from "@/lib/admin/permissions";
import { listAnnouncements } from "@/lib/admin/queries";
import { getCatalogLite } from "@/lib/catalog/server";
import { cohortLabelFromKey, listCohorts } from "@/lib/catalog/shared";
import { requireStaff } from "@/lib/session";
import { cn, dayKey, formatDate, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Announcements" };

const TONE = {
  info: { icon: Info, chip: "bg-brand-soft text-brand-ink" },
  success: { icon: CircleCheck, chip: "bg-success-soft text-success" },
  warning: { icon: TriangleAlert, chip: "bg-warning-soft text-warning" },
} as const;

export default function AnnouncementsPage() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Announcements" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </>
      }
    >
      <Announcements />
    </Suspense>
  );
}

async function Announcements() {
  const staff = await requireStaff();
  if (!can(staff, "announcements.manage"))
    return (
      <>
        <PageHeader title="Announcements" />
        <NoAccess permission="announcements.manage" />
      </>
    );
  const [rows, cat] = await Promise.all([listAnnouncements(), getCatalogLite()]);
  const audiences = [{ value: "all", label: "All students" }, ...listCohorts(cat).map((c) => ({ value: c.key, label: c.label }))];

  const live = rows.filter((a) => a.active && !a.expired).length;

  return (
    <>
      <PageHeader title="Announcements" actions={<NewAnnouncementButton audiences={audiences} today={dayKey()} />} />
      <section>
        <p className="mb-3 text-sm text-muted-foreground">
          {rows.length} total · {live} live
        </p>
        {rows.length === 0 ? (
          <EmptyState icon={Megaphone} title="Nothing posted yet" description="Use “New announcement” to post your first one." />
        ) : (
          <ul className="space-y-3">
            {rows.map((a) => {
              const expired = a.expired;
              const tone = TONE[a.tone];
              return (
                <li key={a.id} className={cn("rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-5", (!a.active || expired) && "opacity-70")}>
                  <div className="flex items-start gap-3">
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tone.chip)}>
                      <tone.icon className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{a.title}</p>
                        {expired ? <Badge tone="neutral">Ended</Badge> : a.active ? <Badge tone="success">Live</Badge> : <Badge tone="neutral">Hidden</Badge>}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{a.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {a.audience === "all" ? "All students" : cohortLabelFromKey(cat, a.audience)} · by {a.createdByName ?? "former staff"} · {timeAgo(a.createdAt)}
                        {a.endsAt && ` · ${expired ? "ended" : "until"} ${formatDate(a.endsAt, { day: "numeric", month: "short" })}`}
                      </p>
                    </div>
                    <AnnouncementActions id={a.id} title={a.title} active={a.active} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
