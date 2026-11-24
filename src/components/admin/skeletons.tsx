import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div>
      <div className="mb-5 flex flex-col gap-2.5 md:flex-row">
        <Skeleton className="h-11 md:max-w-sm md:flex-1" />
        <Skeleton className="h-11 md:w-40" />
        <Skeleton className="h-11 md:w-40" />
      </div>
      <div className="rounded-2xl border border-border bg-surface p-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
