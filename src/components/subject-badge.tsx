"use client";

import { useSubject } from "@/lib/catalog/context";
import { cn } from "@/lib/utils";

/** Square icon tile in the subject's colour. `subject="mixed"` renders the Sunday mixed-test tile. */
export function SubjectIcon({ subject, className, size = "md" }: { subject: string; className?: string; size?: "sm" | "md" | "lg" }) {
  const { meta, Icon, tone } = useSubject(subject);
  const box = { sm: "size-8 rounded-lg [&_svg]:size-4", md: "size-10 rounded-xl [&_svg]:size-5", lg: "size-12 rounded-2xl [&_svg]:size-6" }[size];
  return (
    <span className={cn("inline-grid shrink-0 place-items-center", box, meta ? tone.soft : "bg-brand-soft text-brand-ink", className)}>
      <Icon aria-hidden />
    </span>
  );
}

export function SubjectChip({ subject, className }: { subject: string; className?: string }) {
  const { meta, name, tone } = useSubject(subject);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", meta ? tone.soft : "bg-brand-soft text-brand-ink", className)}>
      <span className={cn("size-1.5 rounded-full", meta ? tone.solid : "bg-brand")} />
      {meta ? name : subject === "mixed" ? "Mixed" : name}
    </span>
  );
}
