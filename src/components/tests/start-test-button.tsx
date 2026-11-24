"use client";

import { ArrowRight, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { startDailyTestAction, startSundayTestAction } from "@/lib/actions/tests";
import { PreparingOverlay } from "./preparing-overlay";

export function StartTestButton({
  subject,
  kind = "daily",
  label = "Start",
  size = "sm",
  variant = "primary",
  className,
}: {
  subject?: string;
  kind?: "daily" | "sunday";
  label?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = kind === "sunday" ? await startSundayTestAction() : await startDailyTestAction(subject!);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/test/${result.data.testId}`);
    });
  }

  return (
    <>
      <Button size={size} variant={variant} onClick={onClick} loading={pending} className={className}>
        {!pending && (size === "sm" ? <Play className="fill-current" /> : null)}
        {label}
        {!pending && size !== "sm" && <ArrowRight />}
      </Button>
      <PreparingOverlay open={pending} title={kind === "sunday" ? "Building your Sunday super test" : undefined} />
    </>
  );
}
