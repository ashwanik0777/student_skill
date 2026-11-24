import {
  BookOpenText,
  CircleHelp,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  MessagesSquare,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { can, type Permission, type Role } from "@/lib/admin/permissions";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** null = every staff member. */
  permission: Permission | null;
  group: "Manage" | "Content" | "Administration";
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, permission: null, group: "Manage" },
  { href: "/admin/students", label: "Students", icon: Users, permission: "students.view", group: "Manage" },
  { href: "/admin/community", label: "Doubt forum", icon: MessagesSquare, permission: "community.moderate", group: "Manage" },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone, permission: "announcements.manage", group: "Manage" },
  { href: "/admin/courses", label: "Courses", icon: GraduationCap, permission: "catalog.manage", group: "Content" },
  { href: "/admin/syllabus", label: "Subjects & chapters", icon: BookOpenText, permission: "catalog.manage", group: "Content" },
  { href: "/admin/questions", label: "Question bank", icon: CircleHelp, permission: "questions.manage", group: "Content" },
  { href: "/admin/review", label: "Review queue", icon: ClipboardCheck, permission: "questions.manage", group: "Content" },
  { href: "/admin/staff", label: "Staff & roles", icon: ShieldCheck, permission: "staff.manage", group: "Administration" },
  { href: "/admin/settings", label: "Settings", icon: Settings, permission: "settings.manage", group: "Administration" },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, permission: "audit.view", group: "Administration" },
];

export function canSee(staff: { role: Role; permissions: readonly string[] }, item: AdminNavItem) {
  return item.permission === null || can(staff, item.permission);
}

/** Hrefs a staff member may open (plain strings so they can cross the server → client boundary). */
export function allowedHrefs(staff: { role: Role; permissions: readonly string[] }) {
  return ADMIN_NAV.filter((item) => canSee(staff, item)).map((item) => item.href);
}

export function isAdminActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}
