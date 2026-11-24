import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
        <Icon className="size-6" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
