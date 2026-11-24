import type { Metadata } from "next";
import { Suspense } from "react";
import { TutorChat } from "@/components/tutor/tutor-chat";
import { Skeleton } from "@/components/ui/skeleton";
import { listThreads } from "@/lib/services/chat";
import { suggestedPrompts } from "@/lib/catalog/prompts";
import { getCatalogLite } from "@/lib/catalog/server";
import { subjectName } from "@/lib/catalog/shared";
import { requireLearner } from "@/lib/session";

export const metadata: Metadata = { title: "AI Tutor" };

export default function TutorPage(props: PageProps<"/tutor">) {
  return (
    <Suspense fallback={<Skeleton className="h-[calc(100dvh-12.5rem)] rounded-2xl lg:h-[calc(100dvh-5.5rem)]" />}>
      <NewChat searchParams={props.searchParams} />
    </Suspense>
  );
}

async function NewChat({ searchParams }: { searchParams: PageProps<"/tutor">["searchParams"] }) {
  const [{ user, config }, cat] = await Promise.all([requireLearner(), getCatalogLite()]);
  const [{ q }, threads] = await Promise.all([searchParams, listThreads(user.id)]);
  const id = crypto.randomUUID();
  const prompt = typeof q === "string" ? q.slice(0, 2000) : undefined;
  return (
    <TutorChat
      key={id}
      id={id}
      isNew
      initialMessages={[]}
      initialPrompt={prompt}
      threads={threads.map((t) => ({ ...t, updatedAt: t.updatedAt.toISOString() }))}
      userName={user.name.split(" ")[0]}
      userImage={user.image}
      courseLabel={config.short}
      suggestions={suggestedPrompts(config, (slug) => subjectName(cat, slug))}
    />
  );
}
