import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cache } from "react";
import { Button } from "@/components/ui/button";
import { isStaff, ROLE_LABEL } from "@/lib/admin/permissions";
import { getCatalogLite } from "@/lib/catalog/server";
import { courseForTrack, trackFromUser } from "@/lib/catalog/shared";
import { getCurrentUser } from "@/lib/session";
import { HeaderUserMenu, type HeaderAccountData } from "./header-user-menu";

/** Who is signed in, rendered on the server: no auth client or extra request on the public pages. */
const loadAccount = cache(async (): Promise<HeaderAccountData | null> => {
  const [user, cat] = await Promise.all([getCurrentUser(), getCatalogLite()]);
  if (!user) return null;
  const course = courseForTrack(cat, trackFromUser(user));
  const staff = isStaff(user);
  const ready = user.onboarded && !!course;
  const home = ready ? "/dashboard" : staff ? "/admin" : "/onboarding";
  return {
    name: user.name,
    email: user.email,
    image: user.image,
    subtitle: course ? course.short : staff ? ROLE_LABEL[user.role] : "Finish setting up",
    home,
    homeLabel: home === "/dashboard" ? "Dashboard" : home === "/admin" ? "Admin panel" : "Finish setup",
    hasProfile: ready,
    isStaff: staff,
  };
});

/** Top bar: avatar + shortcut when signed in, otherwise the sign-in buttons. */
export async function HeaderAccount() {
  const account = await loadAccount();
  if (!account) {
    return (
      <>
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link href="/sign-up">Start free</Link>
        </Button>
      </>
    );
  }
  return (
    <>
      <Button asChild size="sm" className="hidden sm:inline-flex">
        <Link href={account.home}>
          {account.homeLabel} <ArrowRight />
        </Link>
      </Button>
      <HeaderUserMenu account={account} />
    </>
  );
}

/** Bottom of the mobile menu. */
export async function MobileMenuAccount() {
  const account = await loadAccount();
  if (!account) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline">
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button asChild>
          <Link href="/sign-up">Start free</Link>
        </Button>
      </div>
    );
  }
  return (
    <Button asChild className="w-full">
      <Link href={account.home}>
        Open {account.homeLabel.toLowerCase()} <ArrowRight />
      </Link>
    </Button>
  );
}
