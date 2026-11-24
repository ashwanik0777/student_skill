import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ExamClient } from "@/components/exam/exam-client";
import { Skeleton } from "@/components/ui/skeleton";
import { getExamData } from "@/lib/services/tests";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Test" };

export default function TestPage(props: PageProps<"/test/[testId]">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4">
          <Skeleton className="h-[520px] rounded-3xl" />
        </div>
      }
    >
      <Exam params={props.params} />
    </Suspense>
  );
}

async function Exam({ params }: { params: PageProps<"/test/[testId]">["params"] }) {
  const user = await requireUser();
  const { testId } = await params;
  const data = await getExamData(user.id, testId);
  if (!data) notFound();
  if (data.attempt?.status === "completed") redirect(`/results/${data.attempt.id}`);

  return (
    <ExamClient
      test={{
        id: data.test.id,
        title: data.test.title,
        kind: data.test.kind,
        subject: data.test.subject,
        durationSec: data.test.durationSec,
        strict: data.test.strict,
      }}
      questions={data.questions}
      attempt={data.attempt ? { id: data.attempt.id, startedAt: data.attempt.startedAt.toISOString() } : null}
      serverNow={data.serverNow}
    />
  );
}
