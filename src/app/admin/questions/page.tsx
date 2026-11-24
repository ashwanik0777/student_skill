import { CircleHelp, ClipboardCheck, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilterBar } from "@/components/admin/filters";
import { NoAccess, Pagination, param } from "@/components/admin/misc";
import { ImportQuestionsDialog, QuestionRowActions } from "@/components/admin/question-form";
import { Notice } from "@/components/admin/notice";
import { TableSkeleton } from "@/components/admin/skeletons";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listQuestionsAdmin, reviewCounts } from "@/lib/admin/catalog-queries";
import { can } from "@/lib/admin/permissions";
import { getCatalog } from "@/lib/catalog/server";
import { subjectName } from "@/lib/catalog/shared";
import { requireStaff } from "@/lib/session";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Question bank" };

const DIFFICULTY_TONE = { easy: "success", medium: "brand", hard: "warning" } as const;

export default function QuestionsPage({ searchParams }: PageProps<"/admin/questions">) {
  return (
    <>
      <Suspense fallback={<TableSkeleton />}>
        <Questions searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Questions({ searchParams }: { searchParams: PageProps<"/admin/questions">["searchParams"] }) {
  const staff = await requireStaff();
  if (!can(staff, "questions.manage")) return <NoAccess permission="questions.manage" />;
  const [sp, cat] = await Promise.all([searchParams, getCatalog()]);
  const syllabus = cat.syllabi.some((s) => s.id === param(sp, "syllabus")) ? param(sp, "syllabus") : undefined;
  const chapterParam = param(sp, "chapter");
  const chapter = syllabus && cat.syllabi.find((s) => s.id === syllabus)?.chapters.some((c) => c.name === chapterParam) ? chapterParam : undefined;
  const difficulty = ["easy", "medium", "hard"].includes(param(sp, "difficulty") ?? "") ? param(sp, "difficulty") : undefined;
  const status = param(sp, "status") === "active" || param(sp, "status") === "inactive" ? (param(sp, "status") as "active" | "inactive") : undefined;
  const q = param(sp, "q");
  const data = await listQuestionsAdmin({ q, syllabus, chapter, difficulty, status, page: Number(param(sp, "page") ?? 1) });
  const params = { q, syllabus, chapter, difficulty, status };
  const syllabusTitle = (id: string) => cat.syllabi.find((s) => s.id === id)?.title ?? id;
  const chapterOptions = syllabus ? (cat.syllabi.find((s) => s.id === syllabus)?.chapters ?? []) : [];

  return (
    <>
      <PageHeader
        title="Question bank"
        actions={
          <>
            <Suspense fallback={<ReviewLink />}>
              <ReviewLinkWithCount />
            </Suspense>
            <ImportQuestionsDialog syllabi={cat.syllabi.map(({ id, subjectSlug, title }) => ({ id, subjectSlug, title }))} initialSyllabus={syllabus} />
            <Link href={`/admin/questions/new${syllabus ? `?syllabus=${syllabus}` : ""}`} className={buttonVariants()}>
              <Plus /> Add question
            </Link>
          </>
        }
      />
      {param(sp, "saved") === "1" && (
        <Notice>
          Question added.{" "}
          <Link href="/admin/questions/new" className="font-medium text-brand-ink hover:underline">
            Add another
          </Link>
        </Notice>
      )}
      <FilterBar
        action="/admin/questions"
        search={{ name: "q", placeholder: "Search question text, topic or ID", value: q }}
        selects={[
          {
            name: "syllabus",
            label: "Chapter list",
            value: syllabus,
            options: [
              { value: "", label: "All chapter lists" },
              ...cat.syllabi.map((s) => ({ value: s.id, label: `${subjectName(cat, s.subjectSlug)} — ${s.title}` })),
            ],
          },
          ...(syllabus
            ? [{ name: "chapter", label: "Chapter", value: chapter, options: [{ value: "", label: "All chapters" }, ...chapterOptions.map((c) => ({ value: c.name, label: c.name }))] }]
            : []),
          {
            name: "difficulty",
            label: "Difficulty",
            value: difficulty,
            options: [
              { value: "", label: "Any difficulty" },
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
            ],
          },
          {
            name: "status",
            label: "Status",
            value: status,
            options: [
              { value: "", label: "In use + hidden" },
              { value: "active", label: "In use" },
              { value: "inactive", label: "Hidden" },
            ],
          },
        ]}
      />

      {data.rows.length === 0 ? (
        <EmptyState icon={CircleHelp} title="No questions found" description={q || syllabus || difficulty || status ? "Try different filters." : "Add questions or import a JSON file."} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          {data.rows.map((r) => (
            <li key={r.id} className={`flex items-start gap-3 px-4 py-3.5 ${r.active ? "" : "opacity-60"}`}>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/questions/${r.id}`} className="line-clamp-2 text-sm font-medium hover:underline">
                  {r.text}
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <Badge tone={DIFFICULTY_TONE[r.difficulty]}>{r.difficulty}</Badge>
                  {!r.active && <Badge tone="neutral">Hidden</Badge>}
                  <span>{subjectName(cat, r.subjectSlug)}</span>·<span>{r.chapter}</span>·<span>{r.topic}</span>
                  <span className="hidden sm:inline">· {syllabusTitle(r.syllabusId)}</span>
                  <span className="hidden md:inline">· {timeAgo(r.updatedAt)}</span>
                </p>
              </div>
              <QuestionRowActions id={r.id} active={r.active} />
            </li>
          ))}
        </ul>
      )}
      <Pagination page={data.page} pages={data.pages} total={data.total} basePath="/admin/questions" params={params} noun={["question", "questions"]} />
    </>
  );
}

/** Its own boundary: the pending count is a live query, the list above it is cached. */
async function ReviewLinkWithCount() {
  const { pending } = await reviewCounts();
  return <ReviewLink pending={pending} />;
}

function ReviewLink({ pending }: { pending?: number }) {
  return (
    <Link href="/admin/review" className={buttonVariants({ variant: "outline" })}>
      <ClipboardCheck /> Review
      {!!pending && <span className="rounded-full bg-brand px-1.5 text-xs font-semibold tabular-nums text-white">{pending.toLocaleString("en-IN")}</span>}
    </Link>
  );
}
