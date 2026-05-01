import { useTestAttempts } from "@/hooks/useTest";
import { useQuery } from "@tanstack/react-query";
import { UserStreak, UserMilestone } from "@/types";

export default function PerformanceStats() {
  const { data: testAttempts, isLoading: isTestAttemptsLoading } = useTestAttempts();
  
  const { data: streak, isLoading: isStreakLoading } = useQuery<UserStreak>({
    queryKey: ["/api/user/streak"],
  });
  
  const { data: milestones, isLoading: isMilestonesLoading } = useQuery<UserMilestone[]>({
    queryKey: ["/api/user/milestones"],
  });

  const { data: leaderboard, isLoading: isLeaderboardLoading } = useQuery({
    queryKey: ["/api/leaderboard"],
  });

  const isLoading = isTestAttemptsLoading || isStreakLoading || isMilestonesLoading || isLeaderboardLoading;

  // Calculate completed tests
  const completedTests = testAttempts?.filter(attempt => attempt.completedAt) || [];
  const testsCompletedCount = completedTests.length;
  
  // Calculate average score
  const averageScore = completedTests.length > 0
    ? Math.round(
        completedTests.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / completedTests.length
      )
    : 0;
  
  // Get milestone count
  const milestonesCount = milestones?.length || 0;
  
  // Get user rank
  let userRank = "N/A";
  if (leaderboard && leaderboard.length > 0) {
    const rankIndex = leaderboard.findIndex(user => user.id === leaderboard[0].id) + 1;
    if (rankIndex > 0) {
      userRank = `${rankIndex}${getRankSuffix(rankIndex)}`;
    }
  }

  function getRankSuffix(rank: number): string {
    if (rank % 100 >= 11 && rank % 100 <= 13) return 'th';
    
    switch (rank % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-medium mb-6">Your Performance Summary</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Average Score Widget */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="relative inline-block">
            <svg className="w-16 h-16" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e6e6e6" strokeWidth="2"></circle>
              <circle 
                cx="18" 
                cy="18" 
                r="15.9" 
                fill="none" 
                stroke="hsl(var(--primary))" 
                strokeDasharray={`${averageScore} 100`}
                strokeDashoffset="0" 
                strokeWidth="2" 
                className="progress-ring-circle">
              </circle>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold">{isLoading ? '-' : `${averageScore}%`}</span>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">Average Score</p>
        </div>
        
        {/* Tests Completed Widget */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-primary">
            {isLoading ? '-' : testsCompletedCount}
          </div>
          <p className="mt-2 text-sm text-gray-600">Tests Completed</p>
        </div>
        
        {/* Milestones Widget */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-achievement">
            {isLoading ? '-' : milestonesCount}
          </div>
          <p className="mt-2 text-sm text-gray-600">Milestones Reached</p>
        </div>
        
        {/* Rank Widget */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-emerald-500">
            {isLoading ? '-' : userRank}
          </div>
          <p className="mt-2 text-sm text-gray-600">Class Rank</p>
        </div>
      </div>
    </div>
  );
}
