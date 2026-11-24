"use client";

import { ArrowRight, CircleCheck, Flame, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";
import { OrDivider } from "./google-button";
import { SignInForm } from "./sign-in-form";
import { SignUpForm } from "./sign-up-form";

type Mode = "sign-in" | "sign-up";

/** One easing curve for every moving part, so the panel, forms and pill stay in step. */
const EASE = "ease-[cubic-bezier(0.65,0,0.35,1)]";

const COPY = {
  "sign-in": {
    doc: "Sign in",
    title: "Welcome back",
    body: "Sign in to continue your streak.",
    firstField: "signin-email",
  },
  "sign-up": {
    doc: "Create account",
    title: "Create your account",
    body: "Free for students. Your first test is two minutes away.",
    firstField: "signup-name",
  },
} as const;

const FEATURES = [
  { icon: Sparkles, title: "Personalised daily tests", body: "Tuned to your board, class and weak chapters." },
  { icon: CircleCheck, title: "Every answer explained", body: "Understand the why behind each question." },
  { icon: Flame, title: "Streaks, XP and leaderboards", body: "Small daily wins that add up to big results." },
];

/**
 * Sign in and sign up live side by side. On desktop a soft panel with curved edges slides over the form that
 * isn't in use; on phones the two forms sit in a horizontal track behind a segmented switch.
 * The URL (/sign-in ↔ /sign-up) is the source of truth: Next.js syncs usePathname with history.replaceState.
 */
export function AuthShell({ google, notice, signupsOpen = true }: { google: React.ReactNode; notice?: string | null; signupsOpen?: boolean }) {
  const pathname = usePathname();
  const mode: Mode = pathname === "/sign-up" ? "sign-up" : "sign-in";

  function switchTo(next: Mode) {
    if (next === mode) return;
    window.history.replaceState(null, "", `/${next}${window.location.search}`);
    document.title = `${COPY[next].doc} · ${SITE.name}`;
    // After the panel has mostly moved, move focus into the new form (heading on phones: no keyboard pop-up).
    window.setTimeout(() => {
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      document.getElementById(desktop ? COPY[next].firstField : `${next}-title`)?.focus({ preventScroll: true });
    }, 420);
  }

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-background">
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Logo />
        <ThemeToggle />
      </header>

      {/* Phones & tablets: brand strip with a wave edge, then a segmented switch. */}
      <div className="relative bg-panel px-5 pb-16 pt-24 sm:px-8 sm:pb-20 lg:hidden">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-ink">Class 10–12 · JEE · NEET · CUET · NDA</p>
        <p className="mt-3 font-display text-[28px] font-bold leading-[1.1] tracking-tight sm:text-4xl">
          Practise smarter.
          <br />
          Score higher.
        </p>
        <WaveEdge className="absolute inset-x-0 -bottom-px h-12 w-full text-background sm:h-16" />
      </div>
      <div className="px-5 pt-1 sm:px-8 lg:hidden">
        <ModeSwitch mode={mode} onChange={switchTo} />
      </div>

      <div
        className={cn(
          "flex w-[200%] items-start transition-transform duration-500 lg:grid lg:w-full lg:grid-cols-2",
          EASE,
          mode === "sign-up" && "max-lg:-translate-x-1/2",
        )}
      >
        <AuthSection mode="sign-in" active={mode === "sign-in"} notice={notice}>
          {google}
          <OrDivider />
          <SignInForm onSwitch={() => switchTo("sign-up")} />
        </AuthSection>
        <AuthSection mode="sign-up" active={mode === "sign-up"} notice={notice}>
          {signupsOpen ? (
            <>
              {google}
              <OrDivider />
              <SignUpForm onSwitch={() => switchTo("sign-in")} />
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-surface-2 p-5 text-sm">
              <p className="font-semibold">Sign-ups are paused right now</p>
              <p className="mt-1 text-muted-foreground">Please check back later. Already have an account?</p>
              <button type="button" onClick={() => switchTo("sign-in")} className="mt-3 font-medium text-brand-ink hover:underline">
                Sign in instead
              </button>
            </div>
          )}
        </AuthSection>
      </div>

      {/* Desktop: soft brand panel with curved edges that slides over whichever form isn't in use. */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 z-20 hidden w-1/2 bg-panel transition-transform duration-700 lg:block",
          EASE,
          mode === "sign-in" ? "translate-x-full" : "translate-x-0",
        )}
      >
        <CurveEdge className="-left-[95px]" />
        <CurveEdge className="-right-[95px] -scale-x-100" />
        <div className="relative flex h-full flex-col justify-between gap-12 px-12 pb-12 pt-32 xl:px-20 xl:pb-16">
          <div className="grid *:col-start-1 *:row-start-1">
            <PanelCopy
              active={mode === "sign-in"}
              enterFrom="right"
              eyebrow="New to TestPrep?"
              title="Start your prep journey"
              body="Daily tests, instant explanations and an AI tutor, set up for your board, class or entrance exam."
              cta="Create account"
              onClick={() => switchTo("sign-up")}
            />
            <PanelCopy
              active={mode === "sign-up"}
              enterFrom="left"
              eyebrow="Already have an account?"
              title="Good to see you again"
              body="Sign in to pick up your streak, tests and progress right where you left them."
              cta="Sign in"
              onClick={() => switchTo("sign-in")}
            />
          </div>
          <div>
            <ul className="space-y-5">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex items-start gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand-soft-border bg-surface text-brand-ink">
                    <f.icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold">{f.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-10 text-sm text-muted-foreground">CBSE · ICSE / ISC · UP Board · Bihar Board</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthSection({ mode, active, notice, children }: { mode: Mode; active: boolean; notice?: string | null; children: React.ReactNode }) {
  const copy = COPY[mode];
  return (
    <section
      aria-labelledby={`${mode}-title`}
      inert={!active}
      className={cn(
        "w-1/2 shrink-0 px-5 pb-12 pt-8 transition-[opacity,translate] sm:px-8 lg:flex lg:min-h-dvh lg:w-auto lg:flex-col lg:justify-center lg:py-28",
        EASE,
        // Extra room on the inner side so the curved edge never touches the form.
        mode === "sign-in" ? "lg:pl-10 lg:pr-32 xl:pr-40" : "lg:pl-32 lg:pr-10 xl:pl-40",
        active
          ? "opacity-100 delay-150 duration-500"
          : cn("opacity-0 duration-300", mode === "sign-in" ? "lg:-translate-x-6" : "lg:translate-x-6"),
      )}
    >
      <div className="mx-auto w-full max-w-sm">
        <h1 id={`${mode}-title`} tabIndex={-1} className="text-3xl font-bold tracking-tight outline-none">
          {copy.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{copy.body}</p>
        {notice && (
          <p className="mt-4 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-sm" role="status">
            {notice}
          </p>
        )}
        <div className="mt-8">{children}</div>
        <p className="mt-8 text-center text-xs text-muted-foreground">By continuing you agree to use TestPrep for fair, honest practice.</p>
      </div>
    </section>
  );
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div className="relative mx-auto grid max-w-sm grid-cols-2 rounded-xl border border-border bg-surface-2 p-1">
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-surface shadow-soft transition-transform duration-500",
          EASE,
          mode === "sign-up" && "translate-x-full",
        )}
      />
      {(["sign-in", "sign-up"] as const).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => onChange(m)}
          className={cn(
            "relative h-9 rounded-lg text-sm font-medium transition-colors",
            mode === m ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {m === "sign-in" ? "Sign in" : "Sign up"}
        </button>
      ))}
    </div>
  );
}

function PanelCopy({
  active,
  enterFrom,
  eyebrow,
  title,
  body,
  cta,
  onClick,
}: {
  active: boolean;
  enterFrom: "left" | "right";
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div
      inert={!active}
      className={cn(
        "max-w-md transition-[opacity,translate]",
        EASE,
        active
          ? "translate-x-0 opacity-100 delay-200 duration-500"
          : cn("opacity-0 duration-300", enterFrom === "left" ? "-translate-x-10" : "translate-x-10"),
      )}
    >
      <p className="inline-flex items-center gap-2 rounded-full border border-brand-soft-border bg-surface px-3 py-1 text-xs font-medium text-brand-ink">
        <Sparkles className="size-3.5" aria-hidden />
        {eyebrow}
      </p>
      <h2 className="mt-5 text-balance text-4xl font-bold leading-[1.08] tracking-tight xl:text-5xl">{title}</h2>
      <p className="mt-4 max-w-sm text-pretty leading-relaxed text-muted-foreground">{body}</p>
      <Button size="lg" variant="outline" className="mt-8 min-w-44" onClick={onClick}>
        {cta}
        <ArrowRight />
      </Button>
    </div>
  );
}

/** Smooth S-curve in the panel colour; overlaps the panel by 1px so no seam shows while it slides. */
function CurveEdge({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 96 800"
      preserveAspectRatio="none"
      className={cn("pointer-events-none absolute inset-y-0 h-full w-24 text-panel", className)}
    >
      <path fill="currentColor" d="M96 0H80C80 120 16 180 16 300C16 420 80 480 80 620C80 720 48 740 48 800H96Z" />
    </svg>
  );
}

/** Mobile separator between the brand strip and the forms. */
function WaveEdge({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 48" preserveAspectRatio="none" className={cn("pointer-events-none", className)}>
      <path fill="currentColor" d="M0 48V30C70 6 150 2 220 20S350 44 400 18V48Z" />
    </svg>
  );
}
