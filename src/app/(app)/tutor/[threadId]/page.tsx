import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TutorChat } from "@/components/tutor/tutor-chat";
import { Skeleton } from "@/components/ui/skeleton";
import { getThread, listThreads } from "@/lib/services/chat";
import { suggestedPrompts } from "@/lib/catalog/prompts";
import { getCatalogLite } from "@/lib/catalog/server";
import { subjectName } from "@/lib/catalog/shared";
import { requireLearner } from "@/lib/session";

export const metadata: Metadata = { title: "AI Tutor" };

export default function ThreadPage(props: PageProps<"/tutor/[threadId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[calc(100dvh-12.5rem)] rounded-2xl lg:h-[calc(100dvh-5.5rem)]" />}>
      <Thread params={props.params} />
    </Suspense>
  );
}

async function Thread({ params }: { params: PageProps<"/tutor/[threadId]">["params"] }) {
  const [{ user, config }, cat] = await Promise.all([requireLearner(), getCatalogLite()]);
  const { threadId } = await params;
  const [thread, threads] = await Promise.all([getThread(user.id, threadId), listThreads(user.id)]);
  if (!thread) notFound();
  return (
    <TutorChat
      key={thread.id}
      id={thread.id}
      isNew={false}
      initialMessages={thread.messages}
      threads={threads.map((t) => ({ ...t, updatedAt: t.updatedAt.toISOString() }))}
      userName={user.name.split(" ")[0]}
      userImage={user.image}
      courseLabel={config.short}
      suggestions={suggestedPrompts(config, (slug) => subjectName(cat, slug))}
    />
  );
}
