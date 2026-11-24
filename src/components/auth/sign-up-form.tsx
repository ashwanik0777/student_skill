"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { PasswordInput, passwordStrength } from "./password-input";

export function SignUpForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const strength = passwordStrength(password);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name")).trim();
    const email = String(form.get("email")).trim().toLowerCase();
    const next: Record<string, string> = {};
    if (name.length < 2) next.name = "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    const { error } = await signUp.email({ name, email, password });
    if (error) {
      setLoading(false);
      if (error.code === "USER_ALREADY_EXISTS" || error.status === 422) {
        setErrors({ email: "An account with this email already exists. Try signing in." });
      } else {
        setErrors({ form: error.message ?? "Couldn't create your account. Please try again." });
      }
      return;
    }
    router.replace("/onboarding");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Full name" htmlFor="signup-name" error={errors.name}>
        <Input id="signup-name" name="name" autoComplete="name" placeholder="Aarav Sharma" aria-invalid={!!errors.name} />
      </Field>
      <Field label="Email" htmlFor="signup-email" error={errors.email}>
        <Input id="signup-email" name="email" type="email" autoComplete="email" placeholder="you@school.com" aria-invalid={!!errors.email} />
      </Field>
      <Field label="Password" htmlFor="signup-password" error={errors.password}>
        <PasswordInput
          id="signup-password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
        />
        {password && (
          <div className="flex items-center gap-3 pt-1">
            <div className="flex flex-1 gap-1">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={cn("h-1 flex-1 rounded-full", i <= strength.level ? strength.color : "bg-surface-3")} />
              ))}
            </div>
            <span className="w-20 text-right text-xs text-muted-foreground">{strength.label}</span>
          </div>
        )}
      </Field>
      {errors.form && (
        <p className="rounded-xl border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm text-danger" role="alert">
          {errors.form}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Create account {!loading && <ArrowRight />}
      </Button>
      <p className="pt-2 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button type="button" onClick={onSwitch} className="font-medium text-brand-ink hover:underline">
          Sign in
        </button>
      </p>
    </form>
  );
}
