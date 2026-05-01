import { UserStreak } from "@/types";

interface StreakCardProps {
  streak: UserStreak;
  isLoading: boolean;
}

export default function StreakCard({ streak, isLoading }: StreakCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 animate-pulse">
        <div className="h-16 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
      <div>
        <span className="text-sm text-gray-500 block">Your current streak</span>
        <div className="flex items-center mt-1">
          <span className="text-2xl font-bold mr-2 text-achievement">{streak.currentStreak}</span>
          <span className="text-gray-600">days</span>
        </div>
      </div>
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-amber-100">
        <span className="material-icons text-achievement streak-flame">local_fire_department</span>
      </div>
    </div>
  );
}
