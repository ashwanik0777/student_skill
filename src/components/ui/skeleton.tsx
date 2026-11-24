import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-3/70", className)} {...props} />;
}

export function CardSkeleton({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-5 sm:p-6", className)}>
      <Skeleton className="h-5 w-1/3" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${90 - i * 14}%` }} />
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <CardSkeleton className="lg:col-span-2" lines={5} />
        <CardSkeleton lines={4} />
      </div>
    </div>
  );
}
