import { Badge } from "@/components/ui/badge";
import { courseForTrack, trackFromUser, type CatalogLite } from "@/lib/catalog/shared";
import { addDays, dayKey, formatDate } from "@/lib/utils";

type TrackFields = { trackKind: "school" | "exam" | null; board: string | null; grade: number | null; stream: string | null; exam: string | null };

export function courseOf(cat: CatalogLite, u: TrackFields) {
  return courseForTrack(cat, trackFromUser(u))?.short ?? null;
}

/** "Today", "Yesterday" or a date, from an IST day key (YYYY-MM-DD). */
export function lastActiveLabel(day: string | null) {
  if (!day) return "Never";
  const today = dayKey();
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  return formatDate(`${day}T12:00:00+05:30`, { day: "numeric", month: "short" });
}

export function StudentStatusBadge({ suspended, onboarded }: { suspended: boolean; onboarded: boolean }) {
  if (suspended) return <Badge tone="danger">Suspended</Badge>;
  if (!onboarded) return <Badge tone="warning">Not set up</Badge>;
  return <Badge tone="success">Active</Badge>;
}
