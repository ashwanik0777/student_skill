import { ShieldCheck, UserCog } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { NoAccess } from "@/components/admin/misc";
import { TableSkeleton } from "@/components/admin/skeletons";
import { AddStaffDialog, StaffRowActions } from "@/components/admin/staff-manager";
import { PageHeader } from "@/components/app-shell/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PERMISSIONS, ROLE_LABEL, can, grantable, normalisePermissions } from "@/lib/admin/permissions";
import { listStaff, type StaffRow } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/session";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Staff & roles" };

export default function StaffPage() {
  return (
    <>
      <PageHeader title="Staff & roles" />
      <Suspense fallback={<TableSkeleton rows={3} />}>
        <StaffList />
      </Suspense>
    </>
  );
}

function Access({ member }: { member: StaffRow }) {
  if (member.role === "admin") return <Badge tone="brand">Full access</Badge>;
  const perms = normalisePermissions(member.permissions);
  if (perms.length === 0) return <span className="text-xs text-muted-foreground">No permissions</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {perms.map((p) => (
        <Badge key={p} tone="neutral">
          {PERMISSIONS[p].label}
        </Badge>
      ))}
    </div>
  );
}

async function StaffList() {
  const staff = await requireStaff();
  if (!can(staff, "staff.manage")) return <NoAccess permission="staff.manage" />;
  const members = await listStaff();
  const allowed = grantable(staff);
  const manageable = (m: StaffRow) => m.role === "sub_admin" && m.id !== staff.id && normalisePermissions(m.permissions).every((p) => allowed.includes(p));

  return (
    <>
      <div className="mb-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-center">
        <div className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
            <ShieldCheck className="size-[18px]" />
          </span>
          <div>
            <p className="text-sm font-semibold">Super admin</p>
            <p className="text-[13px] text-muted-foreground">
              Full access to everything. Added from the server with <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">npm run admin:create</code>.
            </p>
          </div>
        </div>
        <div className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted-foreground">
            <UserCog className="size-[18px]" />
          </span>
          <div>
            <p className="text-sm font-semibold">Sub-admin</p>
            <p className="text-[13px] text-muted-foreground">
              Any mix of the super admin’s rights — including managing staff. Changes apply instantly and every action is logged.
            </p>
          </div>
        </div>
        <AddStaffDialog allowed={allowed} />
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface shadow-soft xl:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-2/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Access</th>
              <th className="px-4 py-3 font-medium">Last seen</th>
              <th className="px-4 py-3 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border align-top last:border-0">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} src={m.image} size="sm" />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-medium">
                        {m.name}
                        {m.id === staff.id && <Badge tone="outline">You</Badge>}
                        {m.suspendedAt && <Badge tone="danger">Suspended</Badge>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">{ROLE_LABEL[m.role]}</td>
                <td className="max-w-md px-4 py-3.5">
                  <Access member={m} />
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">{m.lastSeen ? timeAgo(m.lastSeen) : "Never"}</td>
                <td className="px-4 py-3.5 text-right">
                  <StaffRowActions
                    isSelf={m.id === staff.id}
                    allowed={allowed}
                    manageable={manageable(m)}
                    member={{ id: m.id, name: m.name, email: m.email, role: m.role as "admin" | "sub_admin", permissions: m.permissions, suspended: !!m.suspendedAt }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone, tablet & small-laptop cards */}
      <ul className="grid gap-3 md:grid-cols-2 xl:hidden">
        {members.map((m) => (
          <li key={m.id} className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <Avatar name={m.name} src={m.image} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 font-medium">
                  {m.name}
                  {m.id === staff.id && <Badge tone="outline">You</Badge>}
                  {m.suspendedAt && <Badge tone="danger">Suspended</Badge>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.email} · {ROLE_LABEL[m.role]}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Access member={m} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">Last seen {m.lastSeen ? timeAgo(m.lastSeen) : "never"}</span>
              <StaffRowActions
                isSelf={m.id === staff.id}
                allowed={allowed}
                manageable={manageable(m)}
                member={{ id: m.id, name: m.name, email: m.email, role: m.role as "admin" | "sub_admin", permissions: m.permissions, suspended: !!m.suspendedAt }}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
