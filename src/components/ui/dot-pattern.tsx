import { useId } from "react";
import { cn } from "@/lib/utils";

/** Solid-dot canvas texture (SVG pattern, no gradients). Colour follows `currentColor`. */
export function DotPattern({ className, gap = 18, radius = 1 }: { className?: string; gap?: number; radius?: number }) {
  const id = useId();
  return (
    <svg aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full text-border-strong", className)}>
      <defs>
        <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse">
          <circle cx={radius} cy={radius} r={radius} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
