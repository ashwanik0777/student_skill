import { useState } from "react";
import { useUser } from "@/hooks/useUser";
import { useQuery } from "@tanstack/react-query";
import { useUserSubjectPerformance } from "@/hooks/useSubjects";
import { useTestAttempts } from "@/hooks/useTest";
import { UserStreak, UserMilestone, UserBadge, TestAttempt } from "@/types";
import { formatTime } from "@/lib/testUtils";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import AchievementCard from "@/components/dashboard/AchievementCard";

export default function Profile() {
  const { user, isLoading: isUserLoading } = useUser();
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: streak, isLoading: isStreakLoading } = useQuery<UserStreak>({
    queryKey: ["/api/user/streak"],
  });
  
  const { data: milestones, isLoading: isMilestonesLoading } = useQuery<UserMilestone[]>({
    queryKey: ["/api/user/milestones"],
  });
  
  const { data: badges, isLoading: isBadgesLoading } = useQuery<UserBadge[]>({
    queryKey: ["/api/user/badges"],
  });
  
  const { data: testAttempts, isLoading: isAttemptsLoading } = useTestAttempts();
  
  const { data: performance, isLoading: isPerformanceLoading } = useUserSubjectPerformance();
  
  const isLoading = isUserLoading || isStreakLoading || isMilestonesLoading || 
                    isBadgesLoading || isAttemptsLoading || isPerformanceLoading;
  
  // Calculate general statistics
  const completedTests = testAttempts?.filter(attempt => attempt.completedAt) || [];
  const totalCompleted = completedTests.length;
  const averageScore = totalCompleted > 0
    ? Math.round(completedTests.reduce((sum, test) => sum + (test.score || 0), 0) / totalCompleted)
    : 0;
  const totalBadges = badges?.length || 0;
  const totalMilestones = milestones?.length || 0;
  const longestStreak = streak?.longestStreak || 0;
  
  if (isLoading) {
    return (
      <div className="py-6 space-y-8">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }
  
  // Sort completed tests by date (most recent first)
  const sortedTestAttempts = [...(completedTests || [])].sort(
    (a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
  );
  
  return (
    <div className="py-6 space-y-8">
      {/* Profile Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="flex-shrink-0">
              <Avatar className="h-24 w-24">
                {user?.avatar ? (
                  <img src={user.avatar} alt={`${user.name}'s avatar`} />
                ) : (
                  <AvatarFallback className="text-2xl">{user?.name.charAt(0)}</AvatarFallback>
                )}
              </Avatar>
            </div>
            
            <div className="flex-grow text-center md:text-left">
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              <p className="text-gray-500">{user?.school || "10th Grade Student"}</p>
              
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-primary">{totalCompleted}</div>
                  <p className="text-xs text-gray-600">Tests Completed</p>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-emerald-500">{averageScore}%</div>
                  <p className="text-xs text-gray-600">Average Score</p>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-amber-500">{totalBadges}</div>
                  <p className="text-xs text-gray-600">Badges Earned</p>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-purple-500">{longestStreak}</div>
                  <p className="text-xs text-gray-600">Longest Streak</p>
                </div>
              </div>
            </div>
            
            <div className="flex-shrink-0 mt-4 md:mt-0">
              <Button variant="outline">Edit Profile</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs for Different Sections */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 md:grid-cols-4 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tests">Test History</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedTestAttempts.length > 0 ? (
                <div className="space-y-4">
                  {sortedTestAttempts.slice(0, 5).map((attempt) => (
                    <div key={attempt.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 h-10 w-10 bg-primary-100 text-primary rounded-full flex items-center justify-center">
                        <span className="material-icons">assignment</span>
                      </div>
                      <div className="flex-grow">
                        <p className="font-medium">Completed {attempt.test?.title || "Test"}</p>
                        <p className="text-sm text-gray-500">
                          Score: {attempt.score}% | {new Date(attempt.completedAt || "").toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="flex-shrink-0">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <span className="material-icons text-gray-400 text-3xl mb-2">history</span>
                  <p className="text-gray-500">No recent activity</p>
                  <p className="text-sm text-gray-400 mt-1">Complete tests to see your activity here</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              {badges && badges.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {badges.slice(0, 4).map((badge) => (
                    <AchievementCard key={badge.id} badge={badge} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <span className="material-icons text-gray-400 text-3xl mb-2">emoji_events</span>
                  <p className="text-gray-500">No achievements yet</p>
                  <p className="text-sm text-gray-400 mt-1">Complete tests to earn badges and achievements</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Test History Tab */}
        <TabsContent value="tests">
          <Card>
            <CardHeader>
              <CardTitle>Test History</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedTestAttempts.length > 0 ? (
                <div className="space-y-3">
                  {sortedTestAttempts.map((attempt) => (
                    <div key={attempt.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="mb-3 md:mb-0">
                        <h4 className="font-medium">{attempt.test?.title || "Test"}</h4>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <span className="material-icons text-gray-400 text-sm mr-1">calendar_today</span>
                          {new Date(attempt.completedAt || "").toLocaleDateString()}
                          <span className="mx-2">•</span>
                          <span className="material-icons text-gray-400 text-sm mr-1">schedule</span>
                          {formatTime(attempt.timeTaken || 0)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="bg-gray-50 px-3 py-1 rounded-full">
                          <span className="font-medium text-primary">{attempt.score}%</span>
                        </div>
                        <div className="bg-gray-50 px-3 py-1 rounded-full">
                          <span className="font-medium text-gray-700">
                            {attempt.correctAnswers}/{attempt.totalQuestions} correct
                          </span>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <span className="material-icons text-gray-400 text-3xl mb-2">assignment</span>
                  <p className="text-gray-500">No test history available</p>
                  <p className="text-sm text-gray-400 mt-1">Complete tests to see your history here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Achievements Tab */}
        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle>Badges & Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              {badges && badges.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {badges.map((badge) => (
                    <AchievementCard key={badge.id} badge={badge} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <span className="material-icons text-gray-400 text-3xl mb-2">emoji_events</span>
                  <p className="text-gray-500">No achievements yet</p>
                  <p className="text-sm text-gray-400 mt-1">Complete tests to earn badges and achievements</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              {milestones && milestones.length > 0 ? (
                <div className="space-y-4">
                  {milestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="material-icons text-blue-500">{milestone.milestone.icon}</span>
                      </div>
                      <div>
                        <h4 className="font-medium">{milestone.milestone.name}</h4>
                        <p className="text-sm text-gray-500">{milestone.milestone.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Achieved on {new Date(milestone.achievedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <span className="material-icons text-gray-400 text-3xl mb-2">flag</span>
                  <p className="text-gray-500">No milestones reached</p>
                  <p className="text-sm text-gray-400 mt-1">Complete tests to reach milestones</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Statistics Tab */}
        <TabsContent value="statistics">
          <Card>
            <CardHeader>
              <CardTitle>Subject Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {performance && performance.length > 0 ? (
                <div className="space-y-4">
                  {performance.map((subj) => (
                    <div key={subj.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <span className={`flex items-center justify-center h-10 w-10 rounded-full bg-${subj.subject.color}-light mr-3`}>
                            <span className={`material-icons text-${subj.subject.color}`}>{subj.subject.icon}</span>
                          </span>
                          <div>
                            <h4 className="font-medium">{subj.subject.displayName}</h4>
                            <p className="text-sm text-gray-500">{subj.testsCompleted} tests completed</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold text-${subj.subject.color} text-lg`}>{subj.averageScore}%</p>
                          <p className="text-sm text-gray-500">average score</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div 
                          className={`bg-${subj.subject.color} h-2.5 rounded-full`} 
                          style={{ width: `${subj.averageScore}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <span className="material-icons text-gray-400 text-3xl mb-2">bar_chart</span>
                  <p className="text-gray-500">No subject performance data available</p>
                  <p className="text-sm text-gray-400 mt-1">Complete tests to see your performance</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Activity Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-4 text-center">Tests per Subject</h4>
                  {performance && performance.length > 0 ? (
                    <div className="space-y-3">
                      {performance.map((subj) => (
                        <div key={subj.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className={`material-icons text-${subj.subject.color} mr-2`}>{subj.subject.icon}</span>
                            <span>{subj.subject.displayName}</span>
                          </div>
                          <span className="font-medium">{subj.testsCompleted}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No data available</p>
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-4 text-center">Time Spent (hrs)</h4>
                  {performance && performance.length > 0 ? (
                    <div className="space-y-3">
                      {performance.map((subj) => {
                        const hoursSpent = Math.round((subj.totalTimeSpent / 3600) * 10) / 10;
                        return (
                          <div key={subj.id} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className={`material-icons text-${subj.subject.color} mr-2`}>{subj.subject.icon}</span>
                              <span>{subj.subject.displayName}</span>
                            </div>
                            <span className="font-medium">{hoursSpent}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No data available</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
