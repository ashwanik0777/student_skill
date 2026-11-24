import { ArrowLeft, Lightbulb } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { AskForm } from "@/components/community/ask-form";
import { Card, CardContent } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";
import { aiStatus } from "@/lib/ai/model";
import { getCatalogLite } from "@/lib/catalog/server";
import { subjectName } from "@/lib/catalog/shared";
import { requireLearner } from "@/lib/session";

export const metadata: Metadata = { title: "Ask a doubt" };

export default function AskPage() {
  return (
    <>
      <Link href="/community" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Doubt forum
      </Link>
      <PageHeader title="Ask a doubt" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardContent>
            <Suspense fallback={<CardSkeleton lines={6} className="border-0 p-0" />}>
              <Form />
            </Suspense>
          </CardContent>
        </Card>
        <Card className="self-start">
          <CardContent>
            <p className="flex items-center gap-2 font-semibold">
              <Lightbulb className="size-4 text-warning" /> Tips for a great doubt
            </p>
            <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
              <li>• Mention the chapter, e.g. “Quadratic Equations — Ex 4.3”.</li>
              <li>• Type out the full question, not just “Q5 please”.</li>
              <li>• Say what you tried and where you got stuck.</li>
              <li>• Accept the answer that helped you most.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

async function Form() {
  const [{ config }, cat] = await Promise.all([requireLearner(), getCatalogLite()]);
  return (
    <AskForm
      aiAvailable={aiStatus().available}
      subjects={config.subjects.map((s) => ({ slug: s.slug, name: subjectName(cat, s.slug) }))}
    />
  );
}
