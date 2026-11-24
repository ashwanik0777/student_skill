"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";
import { nextFromLocation } from "./safe-next";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-[18px]">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.26a12 12 0 0 0 0 10.78l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.53 11.53 0 0 0 12 0 12 12 0 0 0 1.26 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}

/** `pending` = Google availability is still being read on the server (render disabled, without the "soon" label). */
export function GoogleButton({ enabled, pending = false }: { enabled: boolean; pending?: boolean }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      loading={loading}
      disabled={!enabled}
      title={enabled || pending ? undefined : "Google sign-in will be available soon"}
      onClick={async () => {
        setLoading(true);
        const { error } = await signIn.social({
          provider: "google",
          callbackURL: nextFromLocation(),
          newUserCallbackURL: "/onboarding",
        });
        if (error) {
          toast.error(error.message ?? "Couldn't connect to Google. Please try again.");
          setLoading(false);
        }
      }}
    >
      {!loading && <GoogleIcon />}
      Continue with Google
      {!enabled && !pending && <span className="ml-1 text-xs font-normal text-muted-foreground">(soon)</span>}
    </Button>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
