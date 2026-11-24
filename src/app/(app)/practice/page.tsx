import { ArrowRight, Info, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { PracticeBuilder } from "@/components/practice/practice-builder";
import { SubjectIcon } from "@/components/subject-badge";
import { AttemptList } from "@/components/tests/attempt-list";
import { Card, CardContent, SectionHeading } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";
import { aiStatus } from "@/lib/ai/model";
import { listAttempts, listPendingPractice } from "@/lib/services/tests";
import { requireLearner } from "@/lib/session";
import { formatDuration, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "AI Practice" };

export default function PracticePage(props: PageProps<"/practice">) {
  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-4" /> AI Practice
          </span>
        }
        title="Build a practice test"
      />
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <CardSkeleton lines={8} />
            <CardSkeleton lines={4} />
          </div>
        }
      >
        <Practice searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function Practice({ searchParams }: { searchParams: PageProps<"/practice">["searchParams"] }) {
  const { user, config } = await requireLearner();
  const sp = await searchParams;
  const subjectParam = typeof sp.subject === "string" ? sp.subject : undefined;
  const ts = subjectParam ? config.subjects.find((s) => s.slug === subjectParam) : undefined;
  const subject = ts ? ts.slug : undefined;
  const chapterParam = typeof sp.chapter === "string" ? sp.chapter : undefined;
  const chapter = ts && chapterParam && ts.chapters.some((c) => c.name === chapterParam) ? chapterParam : undefined;

  const [pending, recent] = await Promise.all([listPendingPractice(user.id, config.key, 5), listAttempts(user.id, { kind: "practice", trackKey: config.key, limit: 5 })]);
  const ai = aiStatus();

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card>
        <CardContent>
          {!ai.available && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-surface-2 p-3.5 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-muted-foreground">
                AI question writing is temporarily unavailable, so practice tests use our hand-checked question bank for now.
              </p>
            </div>
          )}
          <PracticeBuilder
            key={`${subject}-${chapter}`}
            subjects={config.subjects.map((s) => ({ slug: s.slug, chapters: s.chapters }))}
            initialSubject={subject}
            initialChapter={chapter}
          />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardContent>
            <SectionHeading title="Continue practising" />
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unfinished practice tests. Generate one to get started.</p>
            ) : (
              <ul className="space-y-2">
                {pending.map((p) => (
                  <li key={p.testId}>
                    <Link
                      href={`/test/${p.testId}`}
                      className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-border-strong hover:bg-surface-2"
                    >
                      <SubjectIcon subject={p.subject} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.questionCount} Qs · {p.durationSec ? formatDuration(p.durationSec) : "untimed"} · {timeAgo(p.createdAt)}
                        </p>
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <div>
          <SectionHeading title="Recent practice results" />
          {recent.length ? (
            <AttemptList rows={recent} />
          ) : (
            <p className="rounded-2xl border border-dashed border-border-strong px-4 py-8 text-center text-sm text-muted-foreground">
              Practice results will appear here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
