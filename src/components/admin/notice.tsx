import { CircleCheck } from "lucide-react";

/** One-line confirmation shown after a server-side redirect (e.g. ?created=1). */
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-5 flex items-center gap-2 rounded-xl border border-success/25 bg-success-soft px-3.5 py-2.5 text-sm" role="status">
      <CircleCheck className="size-4 shrink-0 text-success" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
