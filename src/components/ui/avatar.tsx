import { cn, initials } from "@/lib/utils";

const palette = [
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
} as const;

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const base = cn(
    "inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold ring-1 ring-border",
    sizes[size],
    className,
  );
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} referrerPolicy="no-referrer" className={cn(base, "object-cover")} />;
  }
  return (
    <span className={cn(base, palette[hash(name) % palette.length])} aria-label={name}>
      {initials(name)}
    </span>
  );
}
