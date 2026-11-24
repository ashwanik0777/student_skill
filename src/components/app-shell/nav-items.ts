import {
  Award,
  BotMessageSquare,
  ChartLine,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MessagesSquare,
  Sparkles,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Learn",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/tests", label: "Tests", icon: ClipboardList },
      { href: "/practice", label: "AI Practice", icon: Sparkles },
      { href: "/insights", label: "Insights", icon: ChartLine },
    ],
  },
  {
    title: "Ask",
    items: [
      { href: "/tutor", label: "AI Tutor", icon: BotMessageSquare },
      { href: "/community", label: "Doubt Forum", icon: MessagesSquare },
    ],
  },
  {
    title: "Progress",
    items: [
      { href: "/course", label: "My Course", icon: GraduationCap },
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
      { href: "/achievements", label: "Achievements", icon: Award },
      { href: "/profile", label: "Profile", icon: UserRound },
    ],
  },
];

export const TAB_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/tests", label: "Tests", icon: ClipboardList },
  { href: "/tutor", label: "Tutor", icon: BotMessageSquare },
  { href: "/community", label: "Doubts", icon: MessagesSquare },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
];

export function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`) || (href === "/tests" && pathname.startsWith("/results"));
}
