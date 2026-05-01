import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useUser } from "@/hooks/useUser";
import { Skeleton } from "@/components/ui/skeleton";
import { LeaderboardEntry } from "@/types";

export default function LeaderboardPreview() {
  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
  });
  
  const { user } = useUser();
  
  // Get top 2 users and current user's position
  const topUsers = leaderboard?.slice(0, 2) || [];
  const currentUserPosition = leaderboard?.findIndex(entry => entry.id === user?.id) || -1;
  const currentUserEntry = currentUserPosition >= 0 ? leaderboard?.[currentUserPosition] : null;
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Leaderboard</h3>
          <Link href="/leaderboard" className="text-primary flex items-center text-sm">
            View full leaderboard
            <span className="material-icons text-sm ml-1">arrow_forward</span>
          </Link>
        </div>
        
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Skeleton className="h-8 w-8 rounded-full mr-3" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Leaderboard</h3>
        <Link href="/leaderboard" className="text-primary flex items-center text-sm">
          View full leaderboard
          <span className="material-icons text-sm ml-1">arrow_forward</span>
        </Link>
      </div>
      
      <div className="space-y-4">
        {/* Top student */}
        {topUsers.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-achievement text-white rounded-full font-bold mr-3">1</div>
              <div className="w-8 h-8 bg-gray-200 rounded-full mr-3 flex items-center justify-center">
                {topUsers[0].avatar ? (
                  <img 
                    src={topUsers[0].avatar} 
                    alt={`${topUsers[0].name} avatar`} 
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <span className="text-gray-500 font-semibold">{topUsers[0].name.charAt(0)}</span>
                )}
              </div>
              <div>
                <p className="font-medium">{topUsers[0].name}</p>
                <p className="text-xs text-gray-500">{topUsers[0].stats.averageScore}% average score</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="material-icons text-achievement text-sm mr-1">emoji_events</span>
              <span className="font-medium text-achievement">{topUsers[0].stats.badgeCount} badges</span>
            </div>
          </div>
        )}
        
        {/* Second student */}
        {topUsers.length > 1 && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-300 text-white rounded-full font-bold mr-3">2</div>
              <div className="w-8 h-8 bg-gray-200 rounded-full mr-3 flex items-center justify-center">
                {topUsers[1].avatar ? (
                  <img 
                    src={topUsers[1].avatar} 
                    alt={`${topUsers[1].name} avatar`} 
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <span className="text-gray-500 font-semibold">{topUsers[1].name.charAt(0)}</span>
                )}
              </div>
              <div>
                <p className="font-medium">{topUsers[1].name}</p>
                <p className="text-xs text-gray-500">{topUsers[1].stats.averageScore}% average score</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="material-icons text-gray-500 text-sm mr-1">emoji_events</span>
              <span className="font-medium text-gray-500">{topUsers[1].stats.badgeCount} badges</span>
            </div>
          </div>
        )}
        
        {/* Current user's position */}
        {currentUserEntry && currentUserPosition > -1 && (
          <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg border border-primary-100">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-primary text-white rounded-full font-bold mr-3">
                {currentUserPosition + 1}
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded-full mr-3 flex items-center justify-center">
                {user?.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt="Your avatar" 
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <span className="text-gray-500 font-semibold">{user?.name?.charAt(0)}</span>
                )}
              </div>
              <div>
                <p className="font-medium">You</p>
                <p className="text-xs text-gray-500">{currentUserEntry.stats.averageScore}% average score</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="material-icons text-primary text-sm mr-1">emoji_events</span>
              <span className="font-medium text-primary">{currentUserEntry.stats.badgeCount} badges</span>
            </div>
          </div>
        )}
        
        {(!leaderboard || leaderboard.length === 0) && (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <span className="material-icons text-gray-400 text-3xl mb-2">leaderboard</span>
            <p className="text-gray-500">No leaderboard data available</p>
            <p className="text-sm text-gray-400 mt-1">Complete tests to join the leaderboard</p>
          </div>
        )}
      </div>
    </div>
  );
}
