"use client";

import { Send } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { createPostAction, type PostFormState } from "@/lib/actions/forum";


export function AskForm({ aiAvailable, subjects }: { aiAvailable: boolean; subjects: { slug: string; name: string }[] }) {
  const [state, action, pending] = useActionState<PostFormState, FormData>(createPostAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <Field label="Title" htmlFor="title" error={state.errors?.title} hint="Summarise your doubt in one line.">
        <Input
          id="title"
          name="title"
          defaultValue={state.values?.title}
          placeholder="e.g. Why is the discriminant used to find the nature of roots?"
          maxLength={150}
          aria-invalid={!!state.errors?.title}
        />
      </Field>
      <Field label="Subject" htmlFor="subject" error={state.errors?.subject}>
        <Select id="subject" name="subject" defaultValue={state.values?.subject ?? ""} aria-invalid={!!state.errors?.subject}>
          <option value="" disabled>
            Choose a subject
          </option>
          {subjects.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Details"
        htmlFor="body"
        error={state.errors?.body}
        hint="Share what you tried and where you got stuck. Markdown and $maths$ work."
      >
        <Textarea id="body" name="body" defaultValue={state.values?.body} className="min-h-44" maxLength={5000} aria-invalid={!!state.errors?.body} />
      </Field>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-2 p-3.5 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
        <input type="checkbox" name="askAi" defaultChecked={aiAvailable} disabled={!aiAvailable} className="mt-0.5 size-4 accent-brand" />
        <span>
          <span className="font-medium">Get an instant AI answer</span>
          <span className="block text-muted-foreground">
            {aiAvailable ? "TestPrep AI will post an answer within a few seconds." : "AI answers are temporarily unavailable — classmates can still help."}
          </span>
        </span>
      </label>
      <Button type="submit" size="lg" loading={pending}>
        {!pending && <Send />} Post doubt
      </Button>
    </form>
  );
}
