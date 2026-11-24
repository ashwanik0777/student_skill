import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleSlot } from "@/components/auth/google-slot";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage() {
  const { general } = await getSettings();
  return <AuthShell google={<GoogleSlot />} notice={general.authNotice || null} signupsOpen={general.signupsOpen} />;
}
