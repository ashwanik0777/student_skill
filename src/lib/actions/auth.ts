"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** Signs out on the server (the nextCookies plugin clears the cookies on this response), so app pages don't need
 *  to ship the Better Auth client just for a sign-out button. */
export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
}
