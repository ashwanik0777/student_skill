import {
  ArrowRight,
  Atom,
  BotMessageSquare,
  BriefcaseBusiness,
  ChartLine,
  Check,
  ChevronDown,
  CircleCheck,
  Download,
  Flame,
  GraduationCap,
  Landmark,
  Maximize,
  Medal,
  MessagesSquare,
  RefreshCw,
  Rocket,
  School,
  Sparkles,
  Trophy,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { SubjectIcon } from "@/components/subject-badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Sparkles,
    title: "Daily tests that adapt to you",
    body: "Every subject gets a fresh 10-question test each day. The AI leans into chapters you struggle with and skips what you've mastered.",
    className: "md:col-span-2",
    preview: "adaptive",
  },
  {
    icon: Maximize,
    title: "Real exam focus mode",
    body: "Full-screen, timed and distraction-free. Switch tabs and the test submits itself — just like the real thing.",
  },
  {
    icon: CircleCheck,
    title: "Instant explanations",
    body: "See what you got right, where you slipped, and a clear explanation for every single question.",
  },
  {
    icon: ChartLine,
    title: "Insights that tell you what to do",
    body: "Score trends, chapter-level accuracy and an AI study plan built from your actual mistakes.",
    className: "md:col-span-2",
    preview: "chart",
  },
  {
    icon: BotMessageSquare,
    title: "AI tutor, any time",
    body: "Stuck at 11 pm? Ask the tutor. Step-by-step answers in English or Hindi, with proper maths.",
  },
  {
    icon: Trophy,
    title: "Streaks, badges & leaderboards",
    body: "Earn XP, keep your streak alive, collect badges and climb your class leaderboards — school and all-India.",
  },
  {
    icon: MessagesSquare,
    title: "Doubt forum",
    body: "Ask classmates, answer others, upvote the best explanations — or let the AI chip in.",
  },
  {
    icon: Rocket,
    title: "Moves up with you",
    body: "Finished Class 10? Move up to 11, then 12, then JEE or NEET — on the same account. Your XP, streak and history come with you.",
  },
  {
    icon: WifiOff,
    title: "Works offline",
    body: "Install TestPrep on your phone, download a test, take it on the bus — it syncs the moment you're back online.",
    preview: "offline",
  },
];

const COURSES = [
  { icon: School, title: "Class 10", who: "CBSE · ICSE · UP Board · Bihar Board", subjects: ["Maths", "Science", "Social Science", "English", "Hindi"] },
  { icon: Atom, title: "Class 11–12 Science", who: "PCM, PCB or PCMB · all four boards", subjects: ["Physics", "Chemistry", "Maths", "Biology", "English"] },
  { icon: BriefcaseBusiness, title: "Class 11–12 Commerce", who: "All four boards", subjects: ["Accountancy", "Business Studies", "Economics", "English"] },
  { icon: Landmark, title: "Class 11–12 Arts", who: "All four boards", subjects: ["History", "Political Science", "Geography", "Economics", "English"] },
  { icon: GraduationCap, title: "JEE & NEET", who: "Engineering and medical entrance", subjects: ["Physics", "Chemistry", "Maths", "Biology", "Weekly mocks"] },
  { icon: Medal, title: "CUET & NDA", who: "University and defence entrance", subjects: ["English", "General Test", "GK", "Maths", "Domain subjects"] },
];

const steps = [
  { title: "Pick your course", body: "Your board and class — or the entrance exam you’re targeting. Takes 30 seconds." },
  { title: "Take today’s tests", body: "A 15-minute test for every subject, every day, plus a Sunday super test or mock." },
  { title: "Learn and move up", body: "Explanations, insights and a study plan — then move up a class without losing anything." },
];

const faqs = [
  {
    q: "Which boards and exams are covered?",
    a: "CBSE, ICSE/ISC, UP Board and Bihar Board for Classes 10, 11 and 12 (Science, Commerce and Arts), plus JEE Main & Advanced, NEET-UG, CUET-UG and NDA.",
  },
  {
    q: "What happens when I finish my class?",
    a: "Between 1 February and 31 July, open “My course” and move up — Class 10 → 11 → 12 → your entrance exam. It’s the same account, so your XP, streak, badges and results come with you. You can move up once a year and never back.",
  },
  {
    q: "How are the daily tests personalised?",
    a: "Each day's test looks at your chapter-by-chapter accuracy. Weak and untested chapters show up more often, and question difficulty adjusts to how you're doing.",
  },
  {
    q: "What happens if I switch tabs during a test?",
    a: "Daily and Sunday tests run in a strict, full-screen exam mode. Leaving the window ends the test and submits your answers so far. Practice tests are relaxed.",
  },
  {
    q: "What is the Sunday super test?",
    a: "Every Sunday you get a longer mixed test for your course — PCMB for Class 10, your stream mix for Class 11–12, and full mini-mocks for JEE, NEET, CUET and NDA.",
  },
  {
    q: "Can I use it without internet?",
    a: "Yes. Install TestPrep on your phone, download tests while online, take them offline, and your results sync automatically later.",
  },
  {
    q: "Is it free?",
    a: "Yes — create an account and start practising right away.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* ───────────── Hero ───────────── */}
      <section className="relative overflow-hidden">
        <Container className="grid items-center gap-14 pb-20 pt-12 sm:pt-16 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pb-28 xl:gap-20">
          <div className="animate-fade-up">
            <Link
              href="/#courses"
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-sm shadow-soft transition-colors hover:border-border-strong"
            >
              <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">New</span>
              <span className="truncate text-muted-foreground">Now for Class 11–12, JEE, NEET, CUET & NDA</span>
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
            </Link>
            <h1 className="mt-6 text-[2.5rem] font-bold leading-[1.04] tracking-tight text-balance sm:text-6xl xl:text-7xl">
              Exam prep that <span className="text-brand-ink">learns</span> where you’re stuck.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
              Daily AI-personalised tests for Class 10–12 boards and entrance exams, instant explanations, and a coach that
              turns your mistakes into a plan — so you walk into every exam confident.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/sign-up">
                  Start practising free <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/#how">See how it works</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["CBSE · ICSE/ISC · UP · Bihar", "Class 10–12 + JEE, NEET, CUET, NDA", "English & Hindi"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-success" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="animate-fade-up [animation-delay:120ms]">
            <HeroPreview />
          </div>
        </Container>
      </section>

      {/* ───────────── Numbers ───────────── */}
      <section className="border-y border-border bg-surface">
        <Container>
          <dl className="grid grid-cols-2 divide-border lg:grid-cols-4 lg:divide-x">
            {[
              ["4", "boards · Class 10 to 12"],
              ["4", "entrance exams covered"],
              ["Daily", "personalised test per subject"],
              ["100%", "questions explained"],
            ].map(([value, label]) => (
              <div key={label} className="px-2 py-8 text-center lg:px-6">
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-3xl font-bold tracking-tight tabular sm:text-4xl">{value}</dd>
                <dd className="mt-1 text-sm text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* ───────────── Features ───────────── */}
      <section id="features" className="scroll-mt-20 py-20 sm:py-28">
        <Container>
          <SectionIntro
            eyebrow="Everything you need"
            title="One place to practise, understand and improve"
            body=""
          />
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) =>
              f.preview === "offline" ? (
                <div
                  key={f.title}
                  className="grid items-center gap-6 rounded-3xl border border-border bg-surface p-6 transition-shadow hover:shadow-lift md:col-span-2 lg:p-8 xl:grid-cols-[1fr_1.3fr]"
                >
                  <div>
                    <FeatureIcon icon={f.icon} />
                    <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                  </div>
                  <OfflinePreview />
                </div>
              ) : (
                <div
                  key={f.title}
                  className={cn(
                    "relative overflow-hidden rounded-3xl border border-border bg-surface p-6 transition-shadow hover:shadow-lift lg:p-8",
                    f.className,
                  )}
                >
                  <FeatureIcon icon={f.icon} />
                  <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                  {f.preview === "adaptive" && <AdaptivePreview />}
                  {f.preview === "chart" && <ChartPreview />}
                </div>
              ),
            )}
          </div>
        </Container>
      </section>

      {/* ───────────── How it works ───────────── */}
      <section id="how" className="scroll-mt-20 border-y border-border bg-surface py-20 sm:py-28">
        <Container>
          <SectionIntro eyebrow="How it works" title="From sign-up to your first insight in 15 minutes" />
          <ol className="mt-14 grid gap-4 md:grid-cols-3 lg:gap-6">
            {steps.map((s, i) => (
              <li key={s.title} className="relative rounded-3xl border border-border bg-background p-6 lg:p-8">
                <span className="font-display text-5xl font-bold text-brand-ink/25 tabular">0{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ───────────── Courses ───────────── */}
      <section id="courses" className="scroll-mt-20 py-20 sm:py-28">
        <Container>
          <SectionIntro
            eyebrow="Courses"
            title="One app from Class 10 to your entrance exam"
            body=""
          />
          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2">
            {["CBSE", "ICSE / ISC", "UP Board", "Bihar Board", "JEE", "NEET", "CUET", "NDA"].map((b) => (
              <span key={b} className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium">
                {b}
              </span>
            ))}
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {COURSES.map((c) => (
              <div key={c.title} className="flex flex-col rounded-3xl border border-border bg-surface p-6 lg:p-7">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
                  <c.icon className="size-6" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{c.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.who}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {c.subjects.map((s) => (
                    <span key={s} className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-medium text-foreground/80">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ───────────── Sunday ───────────── */}
      <section id="sunday" className="scroll-mt-20">
        <Container>
          <div className="relative overflow-hidden rounded-[32px] bg-zinc-950 px-6 py-12 text-white sm:px-10 sm:py-14 lg:px-16 lg:py-16 dark:border dark:border-border">
            <DotPattern className="text-white/[0.07]" gap={22} />
            <div className="relative grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">Every Sunday</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">The Sunday super test</h2>
                <p className="mt-4 max-w-md leading-relaxed text-zinc-400">
                  A longer, mixed test built for your course — to train the stamina and subject-switching speed you need on exam day.
                </p>
                <Button asChild size="lg" className="mt-8 bg-white text-zinc-950 hover:bg-zinc-200">
                  <Link href="/sign-up">
                    Join this Sunday <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["10", "Class 10", "Physics · Chemistry · Maths · Biology", "bg-sky-400"],
                  ["12", "Class 11–12", "Your stream mix: PCM, PCB, Commerce or Arts", "bg-emerald-400"],
                  ["J", "JEE mock", "30 questions · Physics, Chemistry, Maths", "bg-violet-400"],
                  ["N", "NEET mock", "30 questions · Physics, Chemistry, Biology", "bg-rose-400"],
                ].map(([letter, name, topics, color]) => (
                  <div key={name} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                    <span className={cn("grid size-10 place-items-center rounded-xl font-display text-base font-bold text-zinc-950", color)}>
                      {letter}
                    </span>
                    <p className="mt-4 font-semibold">{name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">{topics}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ───────────── FAQ ───────────── */}
      <section id="faq" className="scroll-mt-20 py-20 sm:py-28">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <SectionIntro
            align="left"
            eyebrow="FAQ"
            title="Questions, answered"
            body="Can’t find what you’re looking for? Ask in the doubt forum once you sign up."
          />
          <div className="divide-y divide-border rounded-3xl border border-border bg-surface">
            {faqs.map((f) => (
              <details key={f.q} className="group px-5 py-5 sm:px-6 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {f.q}
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* ───────────── Final CTA (calm, neutral) ───────────── */}
      <section className="pb-20 sm:pb-28">
        <Container>
          <div className="relative overflow-hidden rounded-[32px] border border-border bg-surface">
            <DotPattern className="text-border-strong/30" gap={24} />
            <div className="relative grid items-center gap-12 p-6 sm:p-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:p-16">
              <div>
                <p className="text-sm font-semibold text-brand-ink">Start today</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-5xl sm:leading-[1.08]">
                  Your best score starts with today’s test.
                </h2>
                <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-muted-foreground text-pretty">
                  Free for students. Set up your profile in 30 seconds and take your first personalised test in two minutes.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg">
                    <Link href="/sign-up">
                      Create your free account <ArrowRight />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/sign-in">I already have an account</Link>
                  </Button>
                </div>
                <ul className="mt-8 grid gap-x-6 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2">
                  {["No payment needed", "Works on any phone or laptop", "English & Hindi", "Install as an app, works offline"].map((t) => (
                    <li key={t} className="inline-flex items-center gap-2">
                      <Check className="size-4 shrink-0 text-success" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
              <PlanPreview />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

function FeatureIcon({ icon: Icon }: { icon: typeof Sparkles }) {
  return (
    <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
      <Icon className="size-5" />
    </span>
  );
}

function SectionIntro({
  eyebrow,
  title,
  body,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-md"}>
      <p className="text-sm font-semibold text-brand-ink">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-[2.6rem] sm:leading-[1.1]">{title}</h2>
      {body && <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground text-pretty">{body}</p>}
    </div>
  );
}

/** “Today’s plan” mock used in the final CTA — calm product preview instead of a loud colour block. */
function PlanPreview() {
  const rows = [
    { subject: "maths", name: "Mathematics", state: "done", score: 90 },
    { subject: "science", name: "Science", state: "done", score: 80 },
    { subject: "english", name: "English", state: "next" },
    { subject: "sst", name: "Social Science", state: "todo" },
    { subject: "hindi", name: "Hindi", state: "todo" },
  ] as const;
  return (
    <div className="w-full rounded-3xl border border-border bg-background p-5 shadow-lift sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Today’s plan</p>
          <p className="text-xs text-muted-foreground">Personalised daily tests</p>
        </div>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold tabular">2/5 done</span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full w-2/5 rounded-full bg-success" />
      </div>
      <ul className="mt-4 divide-y divide-border">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center gap-3 py-2.5">
            <SubjectIcon subject={r.subject} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
            {r.state === "done" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success tabular">
                <Check className="size-3" /> {r.score}%
              </span>
            ) : r.state === "next" ? (
              <span className="rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-white">Start</span>
            ) : (
              <span className="text-xs text-muted-foreground">15 min</span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-orange-500/10 px-3 py-2.5 text-sm text-orange-700 dark:text-orange-300">
        <Flame className="size-4 shrink-0" />
        <span>
          <span className="font-semibold">12-day streak</span> — one more test keeps it alive
        </span>
      </div>
    </div>
  );
}

function OfflinePreview() {
  const steps = [
    { icon: Download, title: "Download", body: "Save today’s tests while online" },
    { icon: WifiOff, title: "Take offline", body: "Timer and answers work without data" },
    { icon: RefreshCw, title: "Auto-sync", body: "Results and XP sync when you reconnect" },
  ];
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {steps.map((s, i) => (
        <li key={s.title} className="relative rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <s.icon className="size-5 text-brand-ink" />
            <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
          </div>
          <p className="mt-3 text-sm font-semibold">{s.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

function AdaptivePreview() {
  const rows = [
    ["Quadratic Equations", 42, "bg-danger"],
    ["Triangles", 64, "bg-warning"],
    ["Arithmetic Progressions", 88, "bg-success"],
  ] as const;
  return (
    <div className="mt-6 space-y-3 rounded-2xl border border-border bg-background p-4">
      {rows.map(([name, pct, color]) => (
        <div key={name} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 text-sm">
          <span className="truncate">{name}</span>
          <span className="font-mono text-xs text-muted-foreground tabular">{pct}%</span>
          <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      ))}
      <p className="pt-1 text-xs text-muted-foreground">
        Tomorrow: <span className="font-medium text-foreground">+3 Quadratic Equations</span>, fewer AP questions.
      </p>
    </div>
  );
}

function ChartPreview() {
  const points = [38, 46, 44, 58, 55, 67, 72, 70, 81];
  const w = 320;
  const h = 90;
  const step = w / (points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - (p / 100) * h).toFixed(1)}`).join(" ");
  return (
    <div className="mt-6 rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Score trend · last 9 tests</span>
        <span className="font-medium text-success">+43%</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-24 w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
        {[25, 50, 75].map((y) => (
          <line key={y} x1="0" x2={w} y1={h - (y / 100) * h} y2={h - (y / 100) * h} className="stroke-border" strokeDasharray="3 4" />
        ))}
        <path d={d} fill="none" className="stroke-brand" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={i} cx={i * step} cy={h - (p / 100) * h} r="3" className="fill-surface stroke-brand" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  );
}
