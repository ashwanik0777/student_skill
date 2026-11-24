/**
 * Staff roles
 *  - admin ("Super admin"): every permission. Created with `npm run admin:create`, never from the UI.
 *  - sub_admin: only the permissions a staff member with "staff.manage" granted — and a sub-admin can only grant
 *    permissions they hold themselves, so rights never grow beyond what the super admin handed out.
 */
export const PERMISSIONS = {
  "analytics.view": {
    group: "Insights",
    label: "View analytics",
    description: "Overview numbers: sign-ups, active students, tests and scores.",
  },
  "students.view": {
    group: "Students",
    label: "View students",
    description: "Browse students, their course, progress and recent tests.",
  },
  "students.manage": {
    group: "Students",
    label: "Manage students",
    description: "Suspend or restore accounts, sign students out, delete accounts.",
    requires: ["students.view"],
  },
  "catalog.manage": {
    group: "Courses",
    label: "Manage courses & syllabus",
    description: "Boards, exams, streams, courses, subjects, chapters and test settings.",
  },
  "questions.manage": {
    group: "Courses",
    label: "Manage question bank",
    description: "Add, edit, import and remove fallback questions.",
  },
  "community.moderate": {
    group: "Community",
    label: "Moderate doubt forum",
    description: "Read every doubt and remove posts or answers that break the rules.",
  },
  "announcements.manage": {
    group: "Communication",
    label: "Manage announcements",
    description: "Post, hide and delete notices on student dashboards.",
  },
  "staff.manage": {
    group: "Administration",
    label: "Manage staff",
    description: "Add sub-admins and set their permissions (only ones you hold yourself).",
  },
  "settings.manage": {
    group: "Administration",
    label: "Manage settings",
    description: "Course-change rules, sign-ups and other platform settings.",
  },
  "audit.view": {
    group: "Administration",
    label: "View audit log",
    description: "See every action taken by staff members.",
  },
} as const satisfies Record<string, { group: string; label: string; description: string; requires?: readonly string[] }>;

export type Permission = keyof typeof PERMISSIONS;
export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

export type Role = "student" | "admin" | "sub_admin";
export type StaffRole = Exclude<Role, "student">;

export const ROLE_LABEL: Record<Role, string> = { student: "Student", admin: "Super admin", sub_admin: "Sub-admin" };

type Subject = { role: Role; permissions: readonly string[] };

export function isStaff(u: { role: Role } | null | undefined): u is { role: StaffRole } & Subject {
  return !!u && (u.role === "admin" || u.role === "sub_admin");
}

export function isAdmin(u: { role: Role } | null | undefined) {
  return u?.role === "admin";
}

/** Super admins can do everything; sub-admins only what they were granted; students nothing. */
export function can(u: Subject | null | undefined, permission: Permission) {
  if (!u) return false;
  if (u.role === "admin") return true;
  return u.role === "sub_admin" && u.permissions.includes(permission);
}

/** The permissions this staff member may hand to someone else. */
export function grantable(u: Subject): Permission[] {
  if (u.role === "admin") return [...PERMISSION_KEYS];
  return normalisePermissions(u.permissions);
}

/** Keeps only known keys and adds implied ones (e.g. managing students implies viewing them). */
export function normalisePermissions(input: readonly string[]): Permission[] {
  const set = new Set<Permission>();
  for (const key of input) {
    if (!(key in PERMISSIONS)) continue;
    const p = key as Permission;
    set.add(p);
    const def = PERMISSIONS[p];
    if ("requires" in def) for (const r of def.requires) set.add(r as Permission);
  }
  return PERMISSION_KEYS.filter((k) => set.has(k));
}

export const PERMISSION_GROUPS = PERMISSION_KEYS.reduce<{ group: string; keys: Permission[] }[]>((acc, key) => {
  const group = PERMISSIONS[key].group;
  const existing = acc.find((g) => g.group === group);
  if (existing) existing.keys.push(key);
  else acc.push({ group, keys: [key] });
  return acc;
}, []);
