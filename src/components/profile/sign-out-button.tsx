"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { confirmToast } from "@/components/ui/confirm";
import { signOutAction } from "@/lib/actions/auth";

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      loading={pending}
      onClick={() =>
        start(async () => {
          if (!(await confirmToast({ title: "Sign out of TestPrep?", description: "You’ll need your password to sign in again.", confirmLabel: "Sign out", tone: "danger" }))) return;
          await signOutAction();
          router.replace("/");
          router.refresh();
        })
      }
    >
      {!pending && <LogOut />} Sign out
    </Button>
  );
}
