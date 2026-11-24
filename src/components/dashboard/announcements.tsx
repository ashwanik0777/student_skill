import { cookies } from "next/headers";
import { getActiveAnnouncements } from "@/lib/admin/queries";
import { AnnouncementBanner } from "./announcement-banner";
import { DISMISS_COOKIE } from "./announcement-cookie";

/** Staff notices for this student's cohort. The list itself is cached; only the dismiss filter is per request. */
export async function DashboardAnnouncements({ cohort }: { cohort: string }) {
  const [items, jar] = await Promise.all([getActiveAnnouncements(cohort), cookies()]);
  const dismissed = new Set(decodeURIComponent(jar.get(DISMISS_COOKIE)?.value ?? "").split(","));
  const visible = items.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;
  return (
    <div className="mb-6 space-y-3">
      {visible.map((a) => (
        <AnnouncementBanner key={a.id} {...a} />
      ))}
    </div>
  );
}
