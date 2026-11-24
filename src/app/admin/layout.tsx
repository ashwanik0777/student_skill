import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminMobileDrawer, AdminSidebarNav, AdminSidebarUser, AdminTopBarUser } from "@/components/admin/admin-shell-parts";
import { SidebarFooterSkeleton } from "@/components/app-shell/sidebar-footer";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · TestPrep" },
  robots: { index: false, follow: false },
};

function NavSkeleton() {
  return (
    <div className="space-y-2 px-1">
      <Skeleton className="h-3 w-16" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-9" />
      ))}
    </div>
  );
}

function AdminBadge() {
  return <span className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Admin</span>;
}

/** Static chrome; everything that depends on who is signed in streams in behind <Suspense>. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <Logo href="/admin" />
          <AdminBadge />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <Suspense fallback={<NavSkeleton />}>
            <AdminSidebarNav />
          </Suspense>
        </div>
        <div className="p-3 pt-2">
          <Suspense fallback={<SidebarFooterSkeleton />}>
            <AdminSidebarUser />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-xl sm:px-4 lg:hidden">
          <Suspense fallback={<span className="block size-9" />}>
            <AdminMobileDrawer />
          </Suspense>
          <div className="flex items-center gap-2">
            <Logo href="/admin" />
            <AdminBadge />
          </div>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
              <AdminTopBarUser />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto w-full max-w-384 flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</main>
      </div>
    </div>
  );
}
