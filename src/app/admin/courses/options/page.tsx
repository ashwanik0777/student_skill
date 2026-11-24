import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/misc";
import { DeleteOptionButton, OptionDialog } from "@/components/admin/option-dialog";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, SectionHeading } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { can } from "@/lib/admin/permissions";
import { getCatalog } from "@/lib/catalog/server";
import { optionsOf, type CatalogOption } from "@/lib/catalog/shared";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Boards, streams & exams" };

export default function OptionsPage() {
  return (
    <>
      <Link href="/admin/courses" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Courses
      </Link>
      <PageHeader title="Boards, streams & exams" />
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Options />
      </Suspense>
    </>
  );
}

function OptionList({ kind, items, usage }: { kind: CatalogOption["kind"]; items: CatalogOption[]; usage: Map<string, number> }) {
  return (
    <Card>
      <CardContent>
        <SectionHeading title={kind === "board" ? "School boards" : kind === "stream" ? "Streams" : "Competitive exams"} action={<OptionDialog kind={kind} />} />
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {o.name}
                    <span className="font-mono text-[11px] text-muted-foreground">{o.id}</span>
                    {!o.active && <Badge tone="neutral">Hidden</Badge>}
                    {kind === "stream" && o.groupKey && <Badge tone="outline">{o.groupKey}</Badge>}
                    {kind === "exam" && o.needsStream && <Badge tone="outline">+ stream</Badge>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[o.description, o.note].filter(Boolean).join(" · ") || "—"} · {usage.get(`${kind}:${o.id}`) ?? 0} courses
                  </p>
                </div>
                <OptionDialog kind={kind} option={o} />
                <DeleteOptionButton option={o} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

async function Options() {
  const staff = await requireStaff();
  if (!can(staff, "catalog.manage")) return <NoAccess permission="catalog.manage" />;
  const cat = await getCatalog();
  const usage = new Map<string, number>();
  for (const c of cat.courses) {
    const t = c.track;
    const keys = t.kind === "school" ? [`board:${t.board}`, t.stream ? `stream:${t.stream}` : null] : [`exam:${t.exam}`, t.stream ? `stream:${t.stream}` : null];
    for (const k of keys) if (k) usage.set(k, (usage.get(k) ?? 0) + 1);
  }
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <OptionList kind="board" items={optionsOf(cat, "board", true)} usage={usage} />
      <OptionList kind="stream" items={optionsOf(cat, "stream", true)} usage={usage} />
      <OptionList kind="exam" items={optionsOf(cat, "exam", true)} usage={usage} />
    </div>
  );
}
