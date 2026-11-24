import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isStaff } from "@/lib/admin/permissions";
import { getCurrentUser } from "@/lib/session";

/** Uses the user row (not just the session cookie) so suspended accounts aren't bounced back and forth. */
async function RedirectIfSignedIn() {
  const current = await getCurrentUser();
  if (current) redirect(isStaff(current) ? "/admin" : "/dashboard");
  return null;
}

/** The sign-in / sign-up shell is static; only the signed-in check runs per request. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      {children}
    </>
  );
}
