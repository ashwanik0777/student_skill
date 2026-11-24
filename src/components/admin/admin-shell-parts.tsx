import { SidebarFooter } from "@/components/app-shell/sidebar-footer";
import { UserMenu, type ShellUser } from "@/components/app-shell/user-menu";
import { ROLE_LABEL } from "@/lib/admin/permissions";
import { getCatalogLite } from "@/lib/catalog/server";
import { courseForTrack, trackFromUser } from "@/lib/catalog/shared";
import { requireStaff } from "@/lib/session";
import { AdminDrawer, AdminNav } from "./admin-nav";
import { allowedHrefs } from "./nav-items";

/* Request-time pieces of the admin shell. Each sits in its own <Suspense> in the layout. */

export async function AdminSidebarNav() {
  const staff = await requireStaff();
  return <AdminNav allowed={allowedHrefs(staff)} />;
}

export async function AdminMobileDrawer() {
  const staff = await requireStaff();
  return <AdminDrawer allowed={allowedHrefs(staff)} />;
}

async function loadStaffUser(): Promise<ShellUser> {
  const [staff, cat] = await Promise.all([requireStaff(), getCatalogLite()]);
  const course = courseForTrack(cat, trackFromUser(staff));
  return {
    name: staff.name,
    email: staff.email,
    image: staff.image,
    subtitle: ROLE_LABEL[staff.role],
    badge: ROLE_LABEL[staff.role],
    isStaff: true,
    hasCourse: staff.onboarded && !!course,
  };
}

/** Sidebar footer (desktop): theme switch + account menu. */
export async function AdminSidebarUser() {
  return <SidebarFooter area="admin" user={await loadStaffUser()} />;
}

/** Top bar (phones): compact account menu. */
export async function AdminTopBarUser() {
  return <UserMenu area="admin" user={await loadStaffUser()} variant="compact" />;
}
