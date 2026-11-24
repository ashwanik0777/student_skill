"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";
import { PasswordInput } from "./password-input";
import { nextFromLocation } from "./safe-next";

export function SignInForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setLoading(true);
    const { error } = await signIn.email({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
      rememberMe: true,
    });
    if (error) {
      setLoading(false);
      setError(
        error.status === 401 || error.code === "INVALID_EMAIL_OR_PASSWORD"
          ? "That email and password don't match."
          : (error.message ?? "Something went wrong. Please try again."),
      );
      return;
    }
    router.replace(nextFromLocation());
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="signin-email">
        <Input id="signin-email" name="email" type="email" autoComplete="email" placeholder="you@school.com" required />
      </Field>
      <Field label="Password" htmlFor="signin-password">
        <PasswordInput id="signin-password" name="password" autoComplete="current-password" placeholder="Your password" required />
      </Field>
      {error && (
        <p className="rounded-xl border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Sign in {!loading && <ArrowRight />}
      </Button>
      <p className="pt-2 text-center text-sm text-muted-foreground">
        New to TestPrep?{" "}
        <button type="button" onClick={onSwitch} className="font-medium text-brand-ink hover:underline">
          Create an account
        </button>
      </p>
    </form>
  );
}
