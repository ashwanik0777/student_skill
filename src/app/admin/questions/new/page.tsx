import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/misc";
import { QuestionForm } from "@/components/admin/question-form";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { can } from "@/lib/admin/permissions";
import { getCatalog } from "@/lib/catalog/server";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "New question" };

export default function NewQuestionPage({ searchParams }: PageProps<"/admin/questions/new">) {
  return (
    <>
      <Link href="/admin/questions" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Question bank
      </Link>
      <PageHeader title="New question" />
      <Suspense fallback={<Skeleton className="h-[40rem] rounded-2xl" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/admin/questions/new">["searchParams"] }) {
  const staff = await requireStaff();
  if (!can(staff, "questions.manage")) return <NoAccess permission="questions.manage" />;
  const [sp, cat] = await Promise.all([searchParams, getCatalog()]);
  const initial = typeof sp.syllabus === "string" ? sp.syllabus : undefined;
  return (
    <Card className="max-w-3xl">
      <CardContent>
        <QuestionForm syllabi={cat.syllabi} initialSyllabus={initial} />
      </CardContent>
    </Card>
  );
}
