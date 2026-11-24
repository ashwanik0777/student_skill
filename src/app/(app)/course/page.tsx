import { ArrowUpRight, CalendarClock, CircleCheck, GraduationCap, History, Lock, Repeat, Undo2, Users } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { CourseChanger } from "@/components/course/course-changer";
import { SubjectChip } from "@/components/subject-badge";
import { Card, CardContent, SectionHeading } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/skeleton";
import { PROMOTION_TEST_MODE, getTrackRules, promotionTarget } from "@/lib/catalog/rules";
import { getCatalogLite } from "@/lib/catalog/server";
import { courseLabelFromKey } from "@/lib/catalog/shared";
import { listTrackEvents } from "@/lib/services/course";
import { requireLearner } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My course" };

export default function CoursePage() {
  return (
    <>
      <PageHeader title="My course" />
      <Suspense fallback={<PageSkeleton />}>
        <Course />
      </Suspense>
    </>
  );
}

const EVENT_LABEL = { onboarded: "Started", corrected: "Corrected", promoted: "Moved up", exam_switched: "Switched exam" } as const;

async function Course() {
  const { user, track, config } = await requireLearner();
  const [cat, settings, events] = await Promise.all([getCatalogLite(), getSettings(), listTrackEvents(user.id)]);
  const r = settings.rules;
  const rules = getTrackRules(cat, r, { track, onboardedAt: user.onboardedAt, trackSetAt: user.trackSetAt, lastPromotedAt: user.lastPromotedAt });
  const fmt = (d: Date | null) => (d ? formatDate(d, { year: "numeric" }) : "");
  const windowEnds = formatDate(new Date(rules.window.end.getTime() - 1), { year: "numeric" });
  const windowStarts = formatDate(rules.window.start);

  const promo = rules.promotion;
  const target = promotionTarget(cat, track);
  const moveUp: { label: string; title: string; description: string; limits: Parameters<typeof CourseChanger>[0]["limits"] } | null =
    track.kind === "school" && target
      ? target.kind === "grade"
        ? {
            label: `Move up to Class ${target.grade}`,
            title: `Move up to Class ${target.grade}`,
            description: "Pick your stream if your new class has one. You can also switch board if you’re changing schools.",
            limits: { kind: "school", grades: [target.grade] },
          }
        : {
            label: "Start competitive exam prep",
            title: `Finished Class ${track.grade}? Choose your exam`,
            description: "Switch to competitive exam preparation.",
            limits: { kind: "exam" },
          }
      : null;

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        {(PROMOTION_TEST_MODE || r.promotionAlwaysOpen) && (
          <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm">
            <span className="font-semibold">Testing mode is on.</span>{" "}
            <span className="text-muted-foreground">
              “Move up” and exam switching are always open{PROMOTION_TEST_MODE ? " (PROMOTION_TEST_MODE=true in .env)" : " (Admin → Settings)"}.
            </span>
          </div>
        )}
        {/* Current course */}
        <Card>
          <CardContent>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
                  <GraduationCap className="size-6" />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">You’re preparing for</p>
                  <h2 className="mt-0.5 text-2xl font-bold tracking-tight">{config.name}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-4" /> {config.cohort.label} community & leaderboard
                    </span>
                    {user.trackSetAt && <span>Since {fmt(user.trackSetAt)}</span>}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {config.subjects.map((s) => (
                <SubjectChip key={s.slug} subject={s.slug} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Move up / switch exam */}
        {moveUp && (
          <Card>
            <CardContent>
              <SectionHeading
                title={
                  <span className="inline-flex items-center gap-2">
                    <ArrowUpRight className="size-5 text-brand-ink" /> Move up
                  </span>
                }
              />
              {promo.available ? (
                <div className="flex flex-col gap-4 rounded-2xl border border-success/25 bg-success-soft p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm">
                    <span className="font-semibold text-success">Promotion is open.</span> You can move up once this year, until {windowEnds}.
                  </p>
                  <CourseChanger mode="promote" current={track} limits={moveUp.limits} label={moveUp.label} title={moveUp.title} description={moveUp.description} />
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2 p-4 text-sm">
                  <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {promo.block === "already"
                      ? `You’ve already moved up this year. The next chance opens on ${fmt(promo.availableAt)}.`
                      : promo.block === "tenure"
                        ? `You can move up after ${r.minDaysInClass} days in your current class — from ${fmt(promo.availableAt)}.`
                        : `“${moveUp.label}” opens on ${fmt(promo.availableAt)}, when board exams begin. It stays open until ${windowEnds}.`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {rules.examSwitch && (
          <Card>
            <CardContent>
              <SectionHeading
                title={
                  <span className="inline-flex items-center gap-2">
                    <Repeat className="size-5 text-brand-ink" /> Switch exam
                  </span>
                }
              />
              {rules.examSwitch.available ? (
                <CourseChanger
                  mode="switch_exam"
                  current={track}
                  limits={{ kind: "exam" }}
                  variant="outline"
                  label="Choose a different exam"
                  title="Switch your competitive exam"
                  description="Your XP, streak and badges stay. Daily tests switch to the new exam from today."
                />
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="size-4" /> Next switch available on {fmt(rules.examSwitch.availableAt)}.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {rules.canCorrect && (
          <Card>
            <CardContent>
              <SectionHeading
                title={
                  <span className="inline-flex items-center gap-2">
                    <Undo2 className="size-5 text-brand-ink" /> Picked the wrong course?
                  </span>
                }
                description={`You can fix your board, class, stream or exam until ${fmt(rules.correctionEndsAt)}.`}
              />
              <CourseChanger
                mode="correct"
                current={track}
                startFromCurrent
                variant="outline"
                label="Fix my course"
                title="Fix your course"
                description="Choose what you’re really preparing for."
              />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent>
            <SectionHeading title="How course changes work" />
            <ul className="space-y-3 text-sm">
              {[
                ["Fix mistakes", `For ${r.correctionDays} days after you sign up you can change anything.`],
                ["Move up once a year", `From ${windowStarts} to ${windowEnds} you can move one step up: to your next class, then to a competitive exam.`],
                ["Never backwards", "After moving up there is no downgrade — your new class starts fresh while your history stays."],
                ["Exam switch", `Competitive students can change exam once every ${r.examSwitchDays} days.`],
                ["Same account forever", "XP, streak, badges and every past result stay with you."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>
                    <span className="font-medium">{t}. </span>
                    <span className="text-muted-foreground">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SectionHeading
              title={
                <span className="inline-flex items-center gap-2">
                  <History className="size-5 text-muted-foreground" /> History
                </span>
              }
            />
            <ol className="relative space-y-4 border-l border-border pl-5">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-surface bg-brand" />
                  <p className="text-sm font-medium">
                    {EVENT_LABEL[e.type]} · {courseLabelFromKey(cat, e.toKey)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(e.createdAt)}
                    {e.fromKey ? ` · from ${courseLabelFromKey(cat, e.fromKey)}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
