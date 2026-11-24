import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { OnboardingForm } from "@/components/course/onboarding-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { containerClass } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { getCourseConfig } from "@/lib/catalog/server";
import { trackFromUser } from "@/lib/catalog/shared";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Set up your profile" };

async function Onboarding() {
  const user = await requireUser({ allowIncompleteProfile: true });
  if (user.onboarded && (await getCourseConfig(trackFromUser(user)))) redirect("/dashboard");
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Hi {user.name.split(" ")[0]}, what are you preparing for?</h1>
      <div className="mt-8 rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-8">
        <OnboardingForm defaults={user} />
      </div>
    </>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-dvh">
      <header className={cn(containerClass, "flex h-16 items-center justify-between")}>
        <Logo href="/dashboard" />
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 animate-fade-up sm:px-6">
        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="mt-8 h-[28rem] rounded-3xl" />
            </div>
          }
        >
          <Onboarding />
        </Suspense>
      </main>
    </div>
  );
}
