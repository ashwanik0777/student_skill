"use client";

import { Award, ChevronsUpDown, GraduationCap, LogOut, ShieldCheck, UserRound, WifiOff, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

export type ShellUser = {
  name: string;
  email: string;
  image: string | null;
  /** Small line under the name: course, school or role. */
  subtitle: string | null;
  /** Shown as a chip in the menu header (e.g. "Super admin"). */
  badge?: string | null;
  isStaff: boolean;
  /** Whether this person has a student course (shows the student links). */
  hasCourse: boolean;
};

const ICONS: Record<string, LucideIcon> = { profile: UserRound, course: GraduationCap, achievements: Award, offline: WifiOff, admin: ShieldCheck, student: GraduationCap };

type MenuLink = { href: string; label: string; icon: keyof typeof ICONS };

function linksFor(user: ShellUser, area: "student" | "admin"): MenuLink[] {
  const student: MenuLink[] = [
    { href: "/profile", label: "Profile & settings", icon: "profile" },
    { href: "/course", label: "My course", icon: "course" },
    { href: "/achievements", label: "Achievements", icon: "achievements" },
    { href: "/offline", label: "Offline tests", icon: "offline" },
  ];
  if (area === "student") return [...student, ...(user.isStaff ? [{ href: "/admin", label: "Admin panel", icon: "admin" } as MenuLink] : [])];
  return user.hasCourse ? [{ href: "/dashboard", label: "Student app", icon: "student" }, { href: "/profile", label: "Profile & settings", icon: "profile" }] : [];
}

/**
 * Account menu (links and sign out; the theme lives next to it in the shell).
 *  - "sidebar": full-width raised row with avatar, name and role/course — the sidebar footer on desktop.
 *  - "compact": avatar only — the top bar on phones.
 */
export function UserMenu({ user, area = "student", variant = "sidebar" }: { user: ShellUser; area?: "student" | "admin"; variant?: "sidebar" | "compact" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const links = linksFor(user, area);
  const compact = variant === "compact";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          compact
            ? "rounded-full"
            : "group w-full min-w-0 gap-2.5 rounded-xl border border-border bg-surface p-2 pr-2.5 shadow-soft hover:border-border-strong data-[state=open]:border-border-strong",
        )}
        aria-label="Account menu"
      >
        <Avatar name={user.name} src={user.image} size="sm" className={cn(!compact && "size-9 text-[13px]")} />
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold leading-5">{user.name}</span>
              {user.subtitle && <span className="block truncate text-xs leading-4 text-muted-foreground">{user.subtitle}</span>}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={compact ? "end" : "start"}
        side={compact ? "bottom" : "top"}
        sideOffset={8}
        className={compact ? "w-64" : "w-(--radix-dropdown-menu-trigger-width) min-w-56"}
      >
        {compact ? (
          <DropdownMenuLabel>
            <div className="flex items-center gap-3">
              <Avatar name={user.name} src={user.image} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
              </div>
            </div>
            {user.badge && (
              <Badge tone="brand" className="mt-2.5">
                {user.badge}
              </Badge>
            )}
          </DropdownMenuLabel>
        ) : (
          // The row that opened the menu already shows avatar and name; only add what it doesn't.
          <DropdownMenuLabel className="font-normal">
            <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              Signed in as
              {user.badge && <Badge tone="brand">{user.badge}</Badge>}
            </span>
            <span className="mt-0.5 block truncate text-sm font-medium text-foreground">{user.email}</span>
          </DropdownMenuLabel>
        )}
        {links.length > 0 && <DropdownMenuSeparator />}
        {links.map((l) => {
          const Icon = ICONS[l.icon];
          return (
            <DropdownMenuItem key={l.href} asChild>
              <Link href={l.href}>
                <Icon /> {l.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
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
              router.replace("/sign-in");
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
