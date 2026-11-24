import { ChevronLeft, ChevronRight, ShieldOff } from "lucide-react";
import Link from "next/link";
import { PERMISSIONS, type Permission } from "@/lib/admin/permissions";
import { cn } from "@/lib/utils";

export function NoAccess({ permission }: { permission?: Permission }) {
  const need = permission ? `“${PERMISSIONS[permission].label}”` : null;
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted-foreground">
        <ShieldOff className="size-6" aria-hidden />
      </div>
      <h2 className="mt-4 text-base font-semibold">You don’t have access to this section</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
        {need ? `Ask an admin to give you the ${need} permission.` : "Ask an admin to update your permissions."}
      </p>
      <Link href="/admin" className="mt-5 text-sm font-medium text-brand-ink hover:underline">
        Back to overview
      </Link>
    </div>
  );
}

function hrefWith(basePath: string, params: Record<string, string | undefined>, page: number) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  page,
  pages,
  total,
  basePath,
  params,
  noun,
}: {
  page: number;
  pages: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
  noun: [string, string];
}) {
  const link = "inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-surface px-3 text-sm font-medium transition-colors";
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <p>
        {total.toLocaleString("en-IN")} {total === 1 ? noun[0] : noun[1]}
        {pages > 1 && ` · page ${page} of ${pages}`}
      </p>
      {pages > 1 && (
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={hrefWith(basePath, params, page - 1)} className={cn(link, "hover:bg-surface-2 hover:text-foreground")}>
              <ChevronLeft className="size-4" /> Previous
            </Link>
          ) : (
            <span className={cn(link, "opacity-50")}>
              <ChevronLeft className="size-4" /> Previous
            </span>
          )}
          {page < pages ? (
            <Link href={hrefWith(basePath, params, page + 1)} className={cn(link, "hover:bg-surface-2 hover:text-foreground")}>
              Next <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className={cn(link, "opacity-50")}>
              Next <ChevronRight className="size-4" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Reads one string value from Next's searchParams record. */
export function param(sp: Record<string, string | string[] | undefined>, key: string) {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
}
