"use client";

import { X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

/** Toast confirmations live outside the dialog; interacting with them must not dismiss it. */
const fromToast = (target: EventTarget | null) => target instanceof Element && !!target.closest("[data-sonner-toaster]");

export function DialogContent({
  className,
  children,
  hideClose,
  onPointerDownOutside,
  onInteractOutside,
  ...props
}: React.ComponentProps<typeof D.Content> & { hideClose?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface p-6 shadow-pop outline-none scrollbar-thin data-[state=open]:animate-pop",
          className,
        )}
        onPointerDownOutside={(e) => {
          if (fromToast(e.target)) e.preventDefault();
          onPointerDownOutside?.(e);
        }}
        onInteractOutside={(e) => {
          if (fromToast(e.target)) e.preventDefault();
          onInteractOutside?.(e);
        }}
        {...props}
      >
        {children}
        {!hideClose && (
          <D.Close
            className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </D.Close>
        )}
      </D.Content>
    </D.Portal>
  );
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof D.Title>) {
  return <D.Title className={cn("pr-8 text-lg font-semibold", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof D.Description>) {
  return <D.Description className={cn("mt-1.5 text-sm text-muted-foreground", className)} {...props} />;
}

/** Side sheet used for the mobile navigation drawer. */
export function SheetContent({ className, children, ...props }: React.ComponentProps<typeof D.Content>) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-xs flex-col border-r border-border bg-surface shadow-pop outline-none data-[state=open]:animate-fade-in",
          className,
        )}
        {...props}
      >
        {children}
      </D.Content>
    </D.Portal>
  );
}
