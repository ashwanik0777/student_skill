import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/tests",
  "/test",
  "/practice",
  "/results",
  "/insights",
  "/tutor",
  "/community",
  "/leaderboard",
  "/achievements",
  "/profile",
  "/course",
  "/onboarding",
  "/admin",
];

/**
 * Optimistic check only: bounce visitors without a session cookie before rendering.
 * The real authorization happens in the Data Access Layer (`requireUser`).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  if (!getSessionCookie(request)) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|offline|.*\\.(?:png|svg|jpg|jpeg|webp|ico|txt)$).*)"],
};
