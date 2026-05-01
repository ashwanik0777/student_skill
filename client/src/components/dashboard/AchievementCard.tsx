import { UserBadge } from "@/types";

interface AchievementCardProps {
  badge: UserBadge;
  locked?: boolean;
}

export default function AchievementCard({ badge, locked = false }: AchievementCardProps) {
  if (locked) {
    return (
      <div className="badge bg-white rounded-lg shadow-md p-4 text-center relative overflow-hidden bg-gray-100">
        <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
          <span className="material-icons text-gray-400 text-2xl">lock</span>
        </div>
        <h4 className="mt-3 font-medium text-sm text-gray-500">{badge.badge.name}</h4>
        <p className="text-xs text-gray-400 mt-1">{badge.badge.description}</p>
      </div>
    );
  }

  const isRecent = new Date(badge.earnedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="badge bg-white rounded-lg shadow-md p-4 text-center relative overflow-hidden">
      {isRecent && <div className="badge-shine"></div>}
      <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
        <span className="material-icons text-achievement text-2xl">{badge.badge.icon}</span>
      </div>
      <h4 className="mt-3 font-medium text-sm">{badge.badge.name}</h4>
      <p className="text-xs text-gray-500 mt-1">{badge.badge.description}</p>
    </div>
  );
}
