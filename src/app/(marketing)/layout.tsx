import { Suspense } from "react";
import { HeaderAccount, MobileMenuAccount } from "@/components/marketing/header-account";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

/** The page itself stays prerendered; only the account corner of the header is read per request. */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        account={
          <Suspense fallback={<div aria-hidden className="h-8 w-8 animate-pulse rounded-full bg-surface-2 sm:w-40 sm:rounded-xl" />}>
            <HeaderAccount />
          </Suspense>
        }
        menuAccount={
          <Suspense fallback={<div aria-hidden className="h-11 animate-pulse rounded-xl bg-surface-2" />}>
            <MobileMenuAccount />
          </Suspense>
        }
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
