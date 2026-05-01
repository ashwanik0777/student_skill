import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/types";
import { useSubjects } from "@/hooks/useSubjects";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Trophy, 
  Award, 
  Library, 
  Percent, 
  Medal, 
  RadioTower, 
  FlameKindling, 
  Crown
} from "lucide-react";

interface LeaderboardUser extends User {
  stats: {
    testsCompleted: number;
    averageScore: number;
    badgeCount: number;
    streakCount?: number;
  };
  rank?: number;
}

export default function Leaderboard() {
  const { toast } = useToast();
  const [timeFilter, setTimeFilter] = useState<string>("weekly");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("score");

  const { data: subjects, isLoading: isSubjectsLoading } = useSubjects();
  
  const { data: leaderboardData, isLoading: isLeaderboardLoading } = useQuery<LeaderboardUser[]>({
    queryKey: ["/api/leaderboard"],
  });

  // Filter and sort leaderboard data
  const processedLeaderboard = leaderboardData ? [...leaderboardData]
    // Filter by subject if needed
    .filter(user => {
      if (subjectFilter === "all") return true;
      // For subject-specific filtering, the API would need to return subject-specific stats
      // This is a placeholder for that functionality
      return true;
    })
    // Sort based on selected criteria
    .sort((a, b) => {
      switch (sortBy) {
        case "score":
          return b.stats.averageScore - a.stats.averageScore;
        case "tests":
          return b.stats.testsCompleted - a.stats.testsCompleted;
        case "badges":
          return b.stats.badgeCount - a.stats.badgeCount;
        case "streak":
          return (b.stats.streakCount || 0) - (a.stats.streakCount || 0);
        default:
          return b.stats.averageScore - a.stats.averageScore;
      }
    })
    // Add rank
    .map((user, index) => ({
      ...user,
      rank: index + 1
    }))
    : [];

  // Get rank styling based on position
  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          icon: <Crown className="h-4 w-4" />
        };
      case 2:
        return {
          color: "text-gray-600",
          bgColor: "bg-gray-100",
          icon: <Trophy className="h-4 w-4" />
        };
      case 3:
        return {
          color: "text-amber-700",
          bgColor: "bg-amber-100", 
          icon: <Medal className="h-4 w-4" />
        };
      default:
        return {
          color: "text-slate-600",
          bgColor: "bg-slate-100",
          icon: null
        };
    }
  };

  // Loading state
  if (isLeaderboardLoading || isSubjectsLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-10 w-1/2 mb-4" />
          <Skeleton className="h-8 w-2/3 mb-4" />
          <div className="flex space-x-4 mb-6">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          {Array(10).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-16 mb-2 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Student Leaderboard</h1>
        <p className="text-muted-foreground mb-6">
          See how you rank against other students based on test performance, badges earned, and learning streaks.
        </p>

        <div className="mb-6 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="w-full md:w-1/3">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">This Week</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="alltime">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-1/3">
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects?.map(subject => (
                  <SelectItem key={subject.id} value={subject.id.toString()}>
                    {subject.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-1/3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Average Score</SelectItem>
                <SelectItem value="tests">Tests Completed</SelectItem>
                <SelectItem value="badges">Badges Earned</SelectItem>
                <SelectItem value="streak">Current Streak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="card">Card View</TabsTrigger>
          </TabsList>

          {/* List View */}
          <TabsContent value="list">
            <Card>
              <CardHeader className="pb-0">
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>
                  {timeFilter === "weekly" ? "This week's" : timeFilter === "monthly" ? "This month's" : "All-time"} leaderboard
                  {subjectFilter !== "all" ? ` for ${subjects?.find(s => s.id.toString() === subjectFilter)?.displayName}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Table header */}
                <div className="hidden md:flex border-b border-gray-200 pb-2 mb-2 text-sm font-medium text-muted-foreground">
                  <div className="w-16 text-center">#</div>
                  <div className="flex-1">Student</div>
                  <div className="w-32 text-center">
                    {sortBy === "score" ? (
                      <span className="flex items-center justify-center">
                        <Percent className="w-4 h-4 mr-1" /> Avg. Score
                      </span>
                    ) : sortBy === "tests" ? (
                      <span className="flex items-center justify-center">
                        <Library className="w-4 h-4 mr-1" /> Tests
                      </span>
                    ) : sortBy === "badges" ? (
                      <span className="flex items-center justify-center">
                        <Award className="w-4 h-4 mr-1" /> Badges
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <FlameKindling className="w-4 h-4 mr-1" /> Streak
                      </span>
                    )}
                  </div>
                </div>

                {/* List items */}
                {processedLeaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {processedLeaderboard.map((user) => {
                      const { color, bgColor, icon } = getRankStyles(user.rank || 0);
                      return (
                        <div
                          key={user.id}
                          className="flex items-center py-3 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-12 md:w-16 flex justify-center">
                            <div className={`w-8 h-8 rounded-full ${bgColor} ${color} flex items-center justify-center font-bold`}>
                              {icon || user.rank}
                            </div>
                          </div>
                          <div className="flex-1 flex items-center">
                            <Avatar className="h-10 w-10 mr-3">
                              <AvatarImage src={user.avatar || ""} alt={user.name} />
                              <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="truncate">
                              <Link href={`/profile/${user.id}`}>
                                <p className="font-medium hover:text-primary">{user.name}</p>
                              </Link>
                              <p className="text-sm text-muted-foreground">{user.school || "Student"}</p>
                            </div>
                          </div>
                          <div className="w-28 md:w-32 text-center font-medium">
                            {sortBy === "score" ? (
                              <div className="flex items-center justify-center">
                                <Percent className="w-4 h-4 mr-1 text-blue-500" />
                                <span>{user.stats.averageScore.toFixed(1)}%</span>
                              </div>
                            ) : sortBy === "tests" ? (
                              <div className="flex items-center justify-center">
                                <Library className="w-4 h-4 mr-1 text-violet-500" />
                                <span>{user.stats.testsCompleted}</span>
                              </div>
                            ) : sortBy === "badges" ? (
                              <div className="flex items-center justify-center">
                                <Award className="w-4 h-4 mr-1 text-amber-500" />
                                <span>{user.stats.badgeCount}</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <FlameKindling className="w-4 h-4 mr-1 text-orange-500" />
                                <span>{user.stats.streakCount || 0}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Trophy className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium">No leaderboard data yet</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Complete tests to appear on the leaderboard
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Card View */}
          <TabsContent value="card">
            {processedLeaderboard.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processedLeaderboard.slice(0, 9).map((user) => {
                  const { color, bgColor, icon } = getRankStyles(user.rank || 0);
                  return (
                    <Card key={user.id} className="overflow-hidden">
                      <div className={`h-1 ${user.rank === 1 ? 'bg-yellow-400' : user.rank === 2 ? 'bg-gray-400' : user.rank === 3 ? 'bg-amber-600' : 'bg-blue-400'}`}></div>
                      <CardHeader className="p-4 pb-0">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center">
                            <Avatar className="h-12 w-12 mr-3">
                              <AvatarImage src={user.avatar || ""} alt={user.name} />
                              <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <Link href={`/profile/${user.id}`}>
                                <CardTitle className="text-base hover:text-primary">{user.name}</CardTitle>
                              </Link>
                              <CardDescription className="text-xs">{user.school || "Student"}</CardDescription>
                            </div>
                          </div>
                          <div className={`w-8 h-8 rounded-full ${bgColor} ${color} flex items-center justify-center font-bold`}>
                            {icon || user.rank}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                              <Percent className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Avg. Score</p>
                              <p className="font-medium">{user.stats.averageScore.toFixed(1)}%</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
                              <Library className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Tests</p>
                              <p className="font-medium">{user.stats.testsCompleted}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                              <Award className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Badges</p>
                              <p className="font-medium">{user.stats.badgeCount}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                              <FlameKindling className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Streak</p>
                              <p className="font-medium">{user.stats.streakCount || 0}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="text-center py-12">
                <Trophy className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium">No leaderboard data yet</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Complete tests to appear on the leaderboard
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Achievements and Badges */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Top Achievements</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mr-3">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">Highest Score</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {processedLeaderboard.length > 0 ? (
                  <div className="flex items-center space-x-3 mt-2">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={processedLeaderboard[0]?.avatar || ""} alt={processedLeaderboard[0]?.name} />
                      <AvatarFallback>{processedLeaderboard[0]?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{processedLeaderboard[0]?.name}</p>
                      <p className="text-sm text-muted-foreground">{processedLeaderboard[0]?.stats.averageScore.toFixed(1)}% average score</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center mr-3">
                    <Library className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">Most Tests</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {processedLeaderboard.length > 0 ? (
                  <div className="flex items-center space-x-3 mt-2">
                    <Avatar className="h-9 w-9">
                      <AvatarImage 
                        src={processedLeaderboard.sort((a, b) => b.stats.testsCompleted - a.stats.testsCompleted)[0]?.avatar || ""} 
                        alt={processedLeaderboard.sort((a, b) => b.stats.testsCompleted - a.stats.testsCompleted)[0]?.name} 
                      />
                      <AvatarFallback>
                        {processedLeaderboard.sort((a, b) => b.stats.testsCompleted - a.stats.testsCompleted)[0]?.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {processedLeaderboard.sort((a, b) => b.stats.testsCompleted - a.stats.testsCompleted)[0]?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {processedLeaderboard.sort((a, b) => b.stats.testsCompleted - a.stats.testsCompleted)[0]?.stats.testsCompleted} tests completed
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mr-3">
                    <Award className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">Most Badges</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {processedLeaderboard.length > 0 ? (
                  <div className="flex items-center space-x-3 mt-2">
                    <Avatar className="h-9 w-9">
                      <AvatarImage 
                        src={processedLeaderboard.sort((a, b) => b.stats.badgeCount - a.stats.badgeCount)[0]?.avatar || ""} 
                        alt={processedLeaderboard.sort((a, b) => b.stats.badgeCount - a.stats.badgeCount)[0]?.name} 
                      />
                      <AvatarFallback>
                        {processedLeaderboard.sort((a, b) => b.stats.badgeCount - a.stats.badgeCount)[0]?.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {processedLeaderboard.sort((a, b) => b.stats.badgeCount - a.stats.badgeCount)[0]?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {processedLeaderboard.sort((a, b) => b.stats.badgeCount - a.stats.badgeCount)[0]?.stats.badgeCount} badges earned
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}