import { LoaderCircle } from "lucide-react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-brand text-brand-foreground hover:bg-brand-hover shadow-[0_1px_0_0_rgb(255_255_255/0.12)_inset,0_1px_2px_0_rgb(0_0_0/0.12)]",
  secondary: "bg-foreground text-background hover:opacity-90",
  outline: "border border-border bg-surface text-foreground hover:bg-surface-2 hover:border-border-strong",
  ghost: "text-foreground hover:bg-surface-2",
  soft: "bg-brand-soft text-brand-ink hover:bg-brand-soft-border",
  danger: "bg-danger text-white hover:opacity-90",
  link: "text-brand-ink underline-offset-4 hover:underline px-0 h-auto",
} as const;

const sizes = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
  icon: "size-10 rounded-xl",
  "icon-sm": "size-8 rounded-lg",
} as const;

export type ButtonProps = React.ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  asChild?: boolean;
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: { variant?: keyof typeof variants; size?: keyof typeof sizes; className?: string } = {}) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,border-color,color,opacity,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  asChild = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={buttonVariants({ variant, size, className })}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <LoaderCircle className="animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
}
