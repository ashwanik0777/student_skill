"use client";

import { LayoutDashboard, LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { confirmToast } from "@/components/ui/confirm";
import { signOutAction } from "@/lib/actions/auth";

export type HeaderAccountData = {
  name: string;
  email: string;
  image: string | null;
  /** Course ("Class 10 · PCM"), staff role, or a nudge to finish setup. */
  subtitle: string;
  home: string;
  homeLabel: string;
  hasProfile: boolean;
  isStaff: boolean;
};

/** Avatar with a green "signed in" dot; opens the account menu. */
export function HeaderUserMenu({ account }: { account: HeaderAccountData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative rounded-full outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`Signed in as ${account.name}. Open account menu`}
      >
        <Avatar name={account.name} src={account.image} size="sm" />
        <span aria-hidden className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-success" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex items-center gap-3">
            <Avatar name={account.name} src={account.image} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{account.name}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{account.email}</p>
            </div>
          </div>
          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            Signed in · {account.subtitle}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={account.home}>
            <LayoutDashboard /> {account.homeLabel}
          </Link>
        </DropdownMenuItem>
        {account.hasProfile && (
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <UserRound /> Profile & settings
            </Link>
          </DropdownMenuItem>
        )}
        {account.isStaff && account.home !== "/admin" && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldCheck /> Admin panel
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={() => {
            // The menu closes; the question moves to a toast.
            startTransition(async () => {
              if (!(await confirmToast({ title: "Sign out of TestPrep?", description: "You’ll need your password to sign in again.", confirmLabel: "Sign out", tone: "danger" }))) return;
              const id = toast.loading("Signing out…");
              await signOutAction();
              toast.dismiss(id);
              router.refresh();
            });
          }}
          className="text-danger data-[highlighted]:text-danger [&_svg]:text-danger"
        >
          <LogOut /> {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
