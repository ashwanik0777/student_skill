import { ArrowLeft, Compass } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto w-full max-w-384 px-4 sm:px-6 lg:px-10 flex h-16 items-center">
        <Logo />
      </header>
      <main className="grid flex-1 place-items-center px-4 pb-24">
        <div className="max-w-md text-center animate-fade-up">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
            <Compass className="size-7" />
          </span>
          <p className="mt-6 font-mono text-sm font-medium text-brand-ink">404</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">This page took a wrong turn</h1>
          <p className="mt-3 text-muted-foreground">The page you’re looking for doesn’t exist, or you don’t have access to it.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft /> Home
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
