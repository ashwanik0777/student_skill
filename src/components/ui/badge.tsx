import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-surface-2 text-muted-foreground border-border",
  brand: "bg-brand-soft text-brand-ink border-brand-soft-border",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  outline: "bg-transparent text-foreground border-border",
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3.5",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
