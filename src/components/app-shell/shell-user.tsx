import { Flame } from "lucide-react";
import { isStaff, ROLE_LABEL } from "@/lib/admin/permissions";
import { getCatalogLite } from "@/lib/catalog/server";
import { courseForTrack, trackFromUser } from "@/lib/catalog/shared";
import { getStats } from "@/lib/services/analytics";
import { getCurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { SidebarFooter } from "./sidebar-footer";
import { UserMenu, type ShellUser } from "./user-menu";

async function loadShellUser(): Promise<(ShellUser & { streak: number; xp: number }) | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const [stats, cat] = await Promise.all([getStats(user.id), getCatalogLite()]);
  const course = courseForTrack(cat, trackFromUser(user));
  const staff = isStaff(user);
  return {
    name: user.name,
    email: user.email,
    image: user.image,
    subtitle: course?.short ?? user.school ?? null,
    badge: staff ? ROLE_LABEL[user.role] : null,
    isStaff: staff,
    hasCourse: !!course,
    streak: stats.currentStreak,
    xp: stats.xp,
  };
}

function StreakChip({ streak, className }: { streak: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold tabular", className)} title={`${streak}-day streak`}>
      <Flame className={cn("size-3.5", streak ? "text-orange-500" : "text-muted-foreground")} />
      {streak} {streak === 1 ? "day" : "days"}
    </span>
  );
}

/** Sidebar footer (desktop): streak + XP, theme switch and the account menu. */
export async function SidebarUser() {
  const user = await loadShellUser();
  if (!user) return null;
  return <SidebarFooter user={user} stats={{ streak: user.streak, xp: user.xp }} />;
}

/** Top bar (phones): streak chip + compact account menu. */
export async function TopBarUser() {
  const user = await loadShellUser();
  if (!user) return null;
  return (
    <div className="flex items-center gap-2">
      <StreakChip streak={user.streak} />
      <UserMenu user={user} variant="compact" />
    </div>
  );
}
