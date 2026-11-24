import { CircleAlert, ClipboardCheck, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { FilterBar } from "@/components/admin/filters";
import { NoAccess, Pagination, param } from "@/components/admin/misc";
import { DatasetImportDialog, GenerateQuestionsDialog, ReviewList } from "@/components/admin/review-queue";
import { TableSkeleton } from "@/components/admin/skeletons";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkTabs } from "@/components/ui/link-tabs";
import { listReviewQueue, reviewCounts } from "@/lib/admin/catalog-queries";
import { can } from "@/lib/admin/permissions";
import { aiStatus } from "@/lib/ai/model";
import { getCatalog } from "@/lib/catalog/server";
import { subjectName } from "@/lib/catalog/shared";
import { listDatasets } from "@/lib/services/dataset-import";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Review queue" };

export default function ReviewPage({ searchParams }: PageProps<"/admin/review">) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Review searchParams={searchParams} />
    </Suspense>
  );
}

async function Review({ searchParams }: { searchParams: PageProps<"/admin/review">["searchParams"] }) {
  const staff = await requireStaff();
  if (!can(staff, "questions.manage")) return <NoAccess permission="questions.manage" />;
  const [sp, cat] = await Promise.all([searchParams, getCatalog()]);
  const state = param(sp, "state") === "rejected" ? "rejected" : "pending";
  const syllabus = cat.syllabi.some((s) => s.id === param(sp, "syllabus")) ? param(sp, "syllabus") : undefined;
  const source = param(sp, "source") === "ai" || param(sp, "source") === "import" ? (param(sp, "source") as "ai" | "import") : undefined;
  const check = param(sp, "check") === "disagree" ? "disagree" : undefined;
  const [data, counts] = await Promise.all([
    listReviewQueue({ state, syllabus, source, flagged: !!check, page: Number(param(sp, "page") ?? 1) }),
    reviewCounts(),
  ]);
  const ai = aiStatus();
  const aiOff = ai.available ? null : (ai.reason ?? "AI is not available");
  const params = { state: state === "pending" ? undefined : state, syllabus, source, check };
  const tabHref = (s: string) => `/admin/review${s === "pending" ? "" : `?state=${s}`}`;
  const syllabusTitles = Object.fromEntries(cat.syllabi.map((s) => [s.id, s.title]));
  const filtered = !!(syllabus || source || check);

  return (
    <>
      <PageHeader
        title="Review queue"
        actions={
          <>
            <DatasetImportDialog
              datasets={listDatasets()}
              syllabi={cat.syllabi.map(({ id, subjectSlug, title }) => ({ id, subjectSlug, title }))}
              disabledReason={aiOff}
            />
            <GenerateQuestionsDialog syllabi={cat.syllabi} initialSyllabus={syllabus} disabledReason={aiOff} />
          </>
        }
      />

      <AiStatusLine ai={ai} />

      <LinkTabs
        className="mb-4"
        active={state}
        tabs={[
          { value: "pending", href: tabHref("pending"), label: <>Pending <Count n={counts.pending} /></> },
          { value: "rejected", href: tabHref("rejected"), label: <>Rejected <Count n={counts.rejected} /></> },
        ]}
      />

      <FilterBar
        action="/admin/review"
        hidden={{ state: params.state }}
        selects={[
          {
            name: "syllabus",
            label: "Chapter list",
            value: syllabus,
            options: [{ value: "", label: "All chapter lists" }, ...cat.syllabi.map((s) => ({ value: s.id, label: `${subjectName(cat, s.subjectSlug)} — ${s.title}` }))],
          },
          {
            name: "source",
            label: "Source",
            value: source,
            options: [
              { value: "", label: "Any source" },
              { value: "ai", label: "Written by AI" },
              { value: "import", label: "Imported" },
            ],
          },
          {
            name: "check",
            label: "AI double-check",
            value: check,
            options: [
              { value: "", label: "Any check result" },
              { value: "disagree", label: "AI disagrees" },
            ],
          },
        ]}
      />

      {data.rows.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={state === "pending" ? "Nothing to review" : "No rejected questions"}
          description={
            filtered
              ? "Try different filters."
              : state === "pending"
                ? "Questions written by AI — for student tests or with “Generate with AI” — and imports sent for review show up here."
                : undefined
          }
        />
      ) : (
        <ReviewList rows={data.rows} state={state} syllabusTitles={syllabusTitles} aiReady={ai.available} />
      )}
      <Pagination page={data.page} pages={data.pages} total={data.total} basePath="/admin/review" params={params} noun={["question", "questions"]} />
    </>
  );
}

function Count({ n }: { n: number }) {
  return <span className="rounded-full bg-surface-2 px-1.5 text-xs tabular-nums text-muted-foreground">{n.toLocaleString("en-IN")}</span>;
}

function AiStatusLine({ ai }: { ai: ReturnType<typeof aiStatus> }) {
  if (ai.available) {
    return (
      <p className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="size-2 rounded-full bg-success" aria-hidden />
        <span>
          <span className="font-medium text-foreground">{ai.provider}</span> · {ai.model} is ready. Questions it writes for student tests also land here.
        </span>
      </p>
    );
  }
  if (!ai.configured) {
    return (
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-3 text-sm">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <p>
          <span className="font-medium">AI is off — no key is set.</span>{" "}
          <span className="text-muted-foreground">
            Get a free Gemini key at aistudio.google.com (Get API key), add it to <code className="font-mono text-[13px]">.env</code> as{" "}
            <code className="font-mono text-[13px]">GOOGLE_GENERATIVE_AI_API_KEY</code> and restart the server.
          </span>
        </p>
      </div>
    );
  }
  const until = ai.pausedUntil ? new Date(ai.pausedUntil).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : null;
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-3 text-sm">
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p>
        <span className="font-medium">{ai.reason}.</span> <span className="text-muted-foreground">AI is paused{until ? ` until about ${until}` : ""}; tests use the approved bank meanwhile.</span>
      </p>
    </div>
  );
}
