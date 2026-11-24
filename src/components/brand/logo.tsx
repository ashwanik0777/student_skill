import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="9" className="fill-brand" />
      <path
        d="M9 16.5l4.2 4.2L23 10.5"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23.4" cy="21.6" r="2.1" fill="#fff" />
    </svg>
  );
}

export function Logo({
  href = "/",
  className,
  markClassName,
  hideText = false,
}: {
  href?: string;
  className?: string;
  markClassName?: string;
  hideText?: boolean;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 rounded-lg", className)} aria-label="TestPrep home">
      <LogoMark className={markClassName} />
      {!hideText && (
        <span className="font-display text-[19px] font-bold tracking-tight">
          Test<span className="text-brand-ink">Prep</span>
        </span>
      )}
    </Link>
  );
}
