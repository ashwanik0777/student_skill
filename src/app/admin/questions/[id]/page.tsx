import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/misc";
import { DeleteQuestionButton, QuestionForm } from "@/components/admin/question-form";
import { ReviewDecision } from "@/components/admin/review-queue";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getQuestionAdmin } from "@/lib/admin/catalog-queries";
import { can } from "@/lib/admin/permissions";
import { getCatalog } from "@/lib/catalog/server";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Edit question" };

export default function EditQuestionPage({ params }: PageProps<"/admin/questions/[id]">) {
  return (
    <>
      <Link href="/admin/questions" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Question bank
      </Link>
      <Suspense fallback={<Skeleton className="h-[40rem] rounded-2xl" />}>
        <Form params={params} />
      </Suspense>
    </>
  );
}

async function Form({ params }: { params: PageProps<"/admin/questions/[id]">["params"] }) {
  const staff = await requireStaff();
  if (!can(staff, "questions.manage")) return <NoAccess permission="questions.manage" />;
  const { id } = await params;
  const [question, cat] = await Promise.all([getQuestionAdmin(id), getCatalog()]);
  if (!question) notFound();
  const inReview = question.review !== "approved";
  return (
    <>
      <PageHeader title="Edit question" actions={<DeleteQuestionButton id={question.id} afterDelete={inReview ? "/admin/review" : "/admin/questions"} />} />
      {inReview && (
        <div className="mb-5 flex max-w-3xl flex-col gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <span className="font-medium">{question.review === "pending" ? "Waiting for review" : "Rejected"}</span>
            <span className="text-muted-foreground">
              {" "}
              · not used in tests{question.sourceNote ? ` · ${question.sourceNote}` : ""}
            </span>
          </p>
          <ReviewDecision id={question.id} state={question.review === "pending" ? "pending" : "rejected"} />
        </div>
      )}
      <Card className="max-w-3xl">
        <CardContent>
          <QuestionForm syllabi={cat.syllabi} question={question} />
        </CardContent>
      </Card>
    </>
  );
}
