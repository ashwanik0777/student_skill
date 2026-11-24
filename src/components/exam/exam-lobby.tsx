import { ArrowLeft, ArrowRight, Clock, EyeOff, Hash, Maximize, ShieldCheck, Timer, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { SubjectChip, SubjectIcon } from "@/components/subject-badge";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";

export function ExamLobby({
  title,
  subject,
  subjects,
  questionCount,
  durationSec,
  strict,
  starting,
  onStart,
  backHref = "/dashboard",
  footnote,
}: {
  title: string;
  subject: string;
  subjects: string[];
  questionCount: number;
  durationSec: number;
  strict: boolean;
  starting: boolean;
  onStart: () => void;
  backHref?: string;
  footnote?: React.ReactNode;
}) {
  const rules: { icon: LucideIcon; text: string }[] = strict
    ? [
        { icon: Maximize, text: "The test opens in full-screen mode." },
        { icon: EyeOff, text: "Switching tabs or apps submits your test immediately." },
        { icon: Timer, text: "When the timer hits zero, your answers are submitted automatically." },
        { icon: ShieldCheck, text: "Your answers are saved as you go — nothing is lost on a slow connection." },
      ]
    : [
        { icon: ShieldCheck, text: "Relaxed practice mode — no full-screen lock." },
        { icon: Timer, text: durationSec ? "There’s a timer to build speed, but no penalty for leaving the page." : "No time limit. Focus on understanding." },
        { icon: Clock, text: "You can leave and resume this practice test later." },
      ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-10">
      <Link href={backHref} className="mb-6 inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-lift sm:p-10 animate-fade-up">
        <div className="flex items-center gap-4">
          <SubjectIcon subject={subject} size="lg" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{strict ? "Exam mode" : "Practice mode"}</p>
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          </div>
        </div>

        {subjects.length > 1 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {subjects.map((s) => (
              <SubjectChip key={s} subject={s} />
            ))}
          </div>
        )}

        <dl className="mt-8 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface-2 p-4">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Hash className="size-3.5" /> Questions
            </dt>
            <dd className="mt-1 font-display text-2xl font-bold tabular">{questionCount}</dd>
          </div>
          <div className="rounded-2xl bg-surface-2 p-4">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" /> Time
            </dt>
            <dd className="mt-1 font-display text-2xl font-bold tabular">{durationSec ? formatDuration(durationSec) : "Untimed"}</dd>
          </div>
        </dl>

        <ul className="mt-8 space-y-3">
          {rules.map((r) => (
            <li key={r.text} className="flex items-start gap-3 text-sm">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
                <r.icon className="size-4" />
              </span>
              <span className="pt-1.5 text-muted-foreground">{r.text}</span>
            </li>
          ))}
        </ul>

        <Button size="lg" className="mt-10 w-full" onClick={onStart} loading={starting}>
          {strict ? "Start test in full screen" : "Start practice"} {!starting && <ArrowRight />}
        </Button>
        {footnote && <p className="mt-4 text-center text-xs text-muted-foreground">{footnote}</p>}
      </div>
    </div>
  );
}
