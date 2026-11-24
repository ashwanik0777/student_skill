"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const STEPS = [
  "Reviewing your recent answers",
  "Picking chapters you need most",
  "Writing fresh questions",
  "Double-checking answer keys",
];

export function PreparingOverlay({ open, title = "Personalising your test" }: { open: boolean; title?: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2600);
    return () => {
      clearInterval(id);
      setStep(0);
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background/90 p-6 backdrop-blur-sm animate-fade-in" role="status" aria-live="polite">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-7 shadow-pop animate-pop">
        <div className="flex items-center gap-3">
          <LogoMark className="size-10" />
          <div>
            <p className="font-display text-lg font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">This usually takes a few seconds.</p>
          </div>
        </div>
        <ul className="mt-6 space-y-3">
          {STEPS.map((label, i) => (
            <li key={label} className={cn("flex items-center gap-3 text-sm transition-opacity", i > step && "opacity-40")}>
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border",
                  i < step ? "border-success bg-success text-white" : i === step ? "border-brand text-brand-ink" : "border-border",
                )}
              >
                {i < step ? <Check className="size-3.5" /> : i === step ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
