import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/useUser";
import { useSubjects } from "@/hooks/useSubjects";
import { useTestAttempts } from "@/hooks/useTest";
import { Test, UserStreak, Badge, UserBadge } from "@/types";

import StreakCard from "@/components/dashboard/StreakCard";
import PerformanceStats from "@/components/dashboard/PerformanceStats";
import SubjectPerformance from "@/components/dashboard/SubjectPerformance";
import TestCard from "@/components/dashboard/TestCard";
import AchievementCard from "@/components/dashboard/AchievementCard";
import SpecialTestCard from "@/components/dashboard/SpecialTestCard";
import LeaderboardPreview from "@/components/dashboard/LeaderboardPreview";
import { AIQuestionGenerator } from "@/components/AIQuestionGenerator";
import { AILearningPath } from "@/components/AILearningPath";
import { AIPerformanceAnalysis } from "@/components/AIPerformanceAnalysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const { user, isLoading: isUserLoading } = useUser();
  
  const { data: streak, isLoading: isStreakLoading } = useQuery<UserStreak>({
    queryKey: ["/api/user/streak"],
  });
  
  const { data: subjects, isLoading: isSubjectsLoading } = useSubjects();
  
  const { data: tests, isLoading: isTestsLoading } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });
  
  const { data: userBadges, isLoading: isUserBadgesLoading } = useQuery<UserBadge[]>({
    queryKey: ["/api/user/badges"],
  });
  
  const { data: badges, isLoading: isBadgesLoading } = useQuery<Badge[]>({
    queryKey: ["/api/badges"],
  });
  
  // Find available tests for today
  const availableTests = tests?.filter(test => !test.isSpecial) || [];
  
  // Find special Sunday test
  const specialTest = tests?.find(test => test.isSpecial);
  
  // Get user badges and prepare some locked badges for display
  const achievedBadges = userBadges || [];
  
  let lockedBadges: UserBadge[] = [];
  if (badges && badges.length > 0 && achievedBadges) {
    const earnedBadgeIds = achievedBadges.map(ub => ub.badge.id);
    lockedBadges = badges
      .filter(badge => !earnedBadgeIds.includes(badge.id))
      .slice(0, 4 - Math.min(achievedBadges.length, 3))
      .map(badge => ({ 
        id: -1, 
        userId: user?.id || 0, 
        badgeId: badge.id, 
        earnedAt: new Date().toISOString(), 
        badge 
      }));
  }
  
  const displayBadges = [...achievedBadges.slice(0, 3), ...lockedBadges];
  
  return (
    <div className="py-6 space-y-8">
      {/* Welcome Section */}
      <div className="flex justify-between items-start flex-wrap md:flex-nowrap">
        <div>
          <h2 className="text-2xl font-bold">
            {isUserLoading ? 'Hi there!' : `Hi, ${user?.name || 'Student'}!`}
          </h2>
          <p className="text-gray-600 mt-1">Let's ace your 10th grade exams!</p>
        </div>
        
        {/* Streak Card */}
        <div className="mt-4 md:mt-0 w-full md:w-auto">
          <StreakCard 
            streak={streak || { userId: 0, currentStreak: 0, longestStreak: 0 }} 
            isLoading={isStreakLoading} 
          />
        </div>
      </div>
      
      {/* Performance Summary */}
      <PerformanceStats />
      
      {/* Subject Performance */}
      <SubjectPerformance />
      
      {/* Daily Tests Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Today's Tests</h3>
          <a href="#" className="text-primary flex items-center text-sm">
            View all
            <span className="material-icons text-sm ml-1">arrow_forward</span>
          </a>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isTestsLoading || isSubjectsLoading ? (
            // Loading state
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md h-56 animate-pulse">
                <div className="h-3 bg-gray-200"></div>
                <div className="p-5 space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded mt-4"></div>
                </div>
              </div>
            ))
          ) : (
            // Available tests
            availableTests.slice(0, 3).map(test => {
              const subject = subjects?.find(s => s.id === test.subjectId);
              if (!subject) return null;
              
              return (
                <TestCard key={test.id} test={test} subject={subject} />
              );
            })
          )}
          
          {!isTestsLoading && (!availableTests || availableTests.length === 0) && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-8 bg-gray-50 rounded-lg">
              <span className="material-icons text-gray-400 text-3xl mb-2">event_busy</span>
              <p className="text-gray-500">No tests available for today</p>
              <p className="text-sm text-gray-400 mt-1">Check back tomorrow for new tests</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Milestones & Achievements */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Your Achievements</h3>
          <a href="#" className="text-primary flex items-center text-sm">
            View all
            <span className="material-icons text-sm ml-1">arrow_forward</span>
          </a>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isUserBadgesLoading || isBadgesLoading ? (
            // Loading state
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-4 text-center animate-pulse">
                <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mt-3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto mt-1"></div>
              </div>
            ))
          ) : (
            displayBadges.map((badgeData, index) => (
              <AchievementCard 
                key={index} 
                badge={badgeData} 
                locked={badgeData.id === -1}
              />
            ))
          )}
          
          {!isUserBadgesLoading && !isBadgesLoading && displayBadges.length === 0 && (
            <div className="col-span-2 md:col-span-4 text-center py-8 bg-gray-50 rounded-lg">
              <span className="material-icons text-gray-400 text-3xl mb-2">emoji_events</span>
              <p className="text-gray-500">No achievements yet</p>
              <p className="text-sm text-gray-400 mt-1">Complete tests to earn badges and achievements</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Upcoming Special Test */}
      {specialTest && (
        <SpecialTestCard test={specialTest} />
      )}
      
      {/* Leaderboard Preview */}
      <LeaderboardPreview />

      {/* AI-Powered Study Tools */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">AI-Powered Study Tools</h3>
        </div>
        
        <Tabs defaultValue="question-generator" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="question-generator">Question Generator</TabsTrigger>
            <TabsTrigger value="performance-analysis">Performance Analysis</TabsTrigger>
            <TabsTrigger value="learning-path">Learning Path</TabsTrigger>
          </TabsList>
          <TabsContent value="question-generator" className="mt-4">
            <AIQuestionGenerator />
          </TabsContent>
          <TabsContent value="performance-analysis" className="mt-4">
            <AIPerformanceAnalysis />
          </TabsContent>
          <TabsContent value="learning-path" className="mt-4">
            <AILearningPath />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
