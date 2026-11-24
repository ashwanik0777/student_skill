import { Suspense } from "react";
import { MobileDrawer } from "@/components/app-shell/mobile-drawer";
import { SidebarUser, TopBarUser } from "@/components/app-shell/shell-user";
import { SidebarFooterSkeleton } from "@/components/app-shell/sidebar-footer";
import { MobileTabBar, SidebarNav } from "@/components/app-shell/sidebar-nav";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      {/* Desktop sidebar: logo, navigation, account footer */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo href="/dashboard" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <SidebarNav />
        </div>
        <div className="p-3 pt-2">
          <Suspense fallback={<SidebarFooterSkeleton />}>
            <SidebarUser />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Phone top bar: menu, logo, theme, account */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-xl sm:px-4 lg:hidden">
          <MobileDrawer />
          <Logo href="/dashboard" />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
              <TopBarUser />
            </Suspense>
          </div>
        </header>

        <main className="mx-auto w-full max-w-384 flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">{children}</main>
        <MobileTabBar />
      </div>
    </div>
  );
}
