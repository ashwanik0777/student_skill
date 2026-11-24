import { cn } from "@/lib/utils";

/**
 * Page-width wrapper used by every section.
 * Full width on phones, tablets and laptops (with side padding);
 * capped at 96rem (1536px) only on very large monitors so text stays readable.
 */
export const containerClass = "mx-auto w-full max-w-384 px-4 sm:px-6 lg:px-10";

export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(containerClass, className)} {...props} />;
}
