"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[70dvh] place-items-center px-4">
      <div className="max-w-md text-center animate-fade-up">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
          <TriangleAlert className="size-7" />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-3 text-muted-foreground">
          An unexpected error happened. Your progress is safe — try again, or head back to your dashboard.
        </p>
        {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>}
        <div className="mt-8 flex justify-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button onClick={reset}>
            <RotateCcw /> Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
