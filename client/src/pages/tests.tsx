import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Test, Subject } from "@/types";
import { useSubjects } from "@/hooks/useSubjects";
import { Link } from "wouter";
import { CalendarIcon, BookOpen, Star, Clock, Zap } from "lucide-react";
import ChapterTestGenerator from "../components/ChapterTestGenerator";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function Tests() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");

  const { data: subjects, isLoading: isSubjectsLoading } = useSubjects();
  
  const { data: allTests, isLoading: isTestsLoading } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  // Filter tests based on filters
  const filteredTests = allTests?.filter((test) => {
    // Filter by search query
    if (
      searchQuery &&
      !test.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Filter by subject
    if (selectedSubject !== "all" && test.subjectId !== parseInt(selectedSubject)) {
      return false;
    }

    return true;
  });

  // Sort tests
  const sortedTests = [...(filteredTests || [])].sort((a, b) => {
    switch (sortBy) {
      case "date":
        return new Date(b.availableAt).getTime() - new Date(a.availableAt).getTime();
      case "name":
        return a.title.localeCompare(b.title);
      case "difficulty":
        // Would need difficulty data on tests
        return 0;
      default:
        return 0;
    }
  });

  // Group tests by subject for the Tabs view
  const testsBySubject: Record<string, Test[]> = {};
  
  if (allTests && subjects) {
    // Add all subjects first to ensure tabs for subjects with no tests
    subjects.forEach(subject => {
      testsBySubject[subject.id.toString()] = [];
    });
    
    // Group tests by subject
    allTests.forEach(test => {
      const subjectId = test.subjectId.toString();
      if (!testsBySubject[subjectId]) {
        testsBySubject[subjectId] = [];
      }
      testsBySubject[subjectId].push(test);
    });
  }

  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // Get subject by ID
  const getSubject = (subjectId: number): Subject | undefined => {
    return subjects?.find(s => s.id === subjectId);
  };

  // Loading state
  if (isSubjectsLoading || isTestsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <div className="flex space-x-4">
            <Skeleton className="h-10 w-1/4" />
            <Skeleton className="h-10 w-1/4" />
            <Skeleton className="h-10 w-1/4" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Available Tests</h1>
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="w-full md:w-1/3">
            <Input
              placeholder="Search tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full md:w-1/3">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects?.map((subject) => (
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
                <SelectItem value="date">Date (newest first)</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        <div className="w-full lg:w-2/3">
          <h2 className="text-2xl font-bold mb-4">
            <Zap className="inline-block mr-2 h-5 w-5 text-primary" />
            Generate Chapter-Wise Test
          </h2>
          <ChapterTestGenerator />
        </div>
        
        <div className="w-full lg:w-1/3">
          <h2 className="text-2xl font-bold mb-4">Test Tips</h2>
          <Card>
            <CardHeader>
              <CardTitle>How to Prepare Effectively</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex gap-2">
                <div className="bg-primary/10 rounded-full p-1 h-6 w-6 flex items-center justify-center text-primary font-bold">1</div>
                <p>Use chapter tests to focus on specific topics you need to improve</p>
              </div>
              <div className="flex gap-2">
                <div className="bg-primary/10 rounded-full p-1 h-6 w-6 flex items-center justify-center text-primary font-bold">2</div>
                <p>Review your previous test results to identify weak areas</p>
              </div>
              <div className="flex gap-2">
                <div className="bg-primary/10 rounded-full p-1 h-6 w-6 flex items-center justify-center text-primary font-bold">3</div>
                <p>Attempt tests from all subjects to maintain balanced preparation</p>
              </div>
              <div className="flex gap-2">
                <div className="bg-primary/10 rounded-full p-1 h-6 w-6 flex items-center justify-center text-primary font-bold">4</div>
                <p>Complete the special tests which combine multiple chapters</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Separator className="my-6" />
      
      <Tabs defaultValue="grid" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="subjects">By Subject</TabsTrigger>
          </TabsList>
          <div className="text-sm text-muted-foreground">
            {filteredTests?.length} tests available
          </div>
        </div>

        {/* Grid View */}
        <TabsContent value="grid" className="space-y-6">
          {sortedTests && sortedTests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedTests.map((test) => {
                const subject = getSubject(test.subjectId);
                return (
                  <TestCard 
                    key={test.id} 
                    test={test} 
                    subject={subject} 
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">No tests found</h3>
              <p className="mt-2 text-sm text-gray-500">
                Try adjusting your filters or search query
              </p>
            </div>
          )}
        </TabsContent>

        {/* By Subject View */}
        <TabsContent value="subjects" className="space-y-8">
          {subjects && subjects.length > 0 ? (
            subjects.map((subject) => {
              const subjectTests = testsBySubject[subject.id.toString()] || [];
              
              // Skip subjects with no tests if we're filtering
              if (subjectTests.length === 0 && (searchQuery || selectedSubject !== "all")) {
                return null;
              }
              
              return (
                <div key={subject.id} className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: subject.color }}
                    ></div>
                    <h2 className="text-xl font-bold">{subject.displayName}</h2>
                    <Badge variant="outline">{subjectTests.length} tests</Badge>
                  </div>
                  
                  {subjectTests.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {subjectTests
                        .filter(test => {
                          if (searchQuery && !test.title.toLowerCase().includes(searchQuery.toLowerCase())) {
                            return false;
                          }
                          return true;
                        })
                        .map((test) => (
                          <TestCard 
                            key={test.id} 
                            test={test} 
                            subject={subject} 
                            compact 
                          />
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">
                        No tests available for this subject
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">No subjects found</h3>
              <p className="mt-2 text-sm text-gray-500">
                Please check back later
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TestCardProps {
  test: Test;
  subject?: Subject;
  compact?: boolean;
}

function TestCard({ test, subject, compact = false }: TestCardProps) {
  // If no subject is provided, use a default color
  const subjectColor = subject?.color || "#888888";
  
  // Format date
  const testDate = new Date(test.availableAt);
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(testDate);
  
  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-md ${compact ? 'h-full' : ''}`}>
      <div className="h-2" style={{ backgroundColor: subjectColor }}></div>
      <CardHeader className={compact ? 'p-4' : 'p-6'}>
        <div className={`flex items-center justify-between ${compact ? 'mb-1' : 'mb-2'}`}>
          <Badge 
            variant="outline" 
            className="flex items-center gap-1 font-normal"
          >
            {subject?.displayName || "Test"}
          </Badge>
          {test.isSpecial && (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              <Star className="w-3 h-3 mr-1" /> Special
            </Badge>
          )}
        </div>
        <CardTitle className={compact ? 'text-base' : 'text-xl'}>
          {test.title}
        </CardTitle>
        {!compact && test.description && (
          <CardDescription>{test.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className={compact ? 'p-4 pt-0' : 'p-6 pt-0'}>
        <div className="space-y-3">
          <div className="flex items-center text-sm text-muted-foreground">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Available from {formattedDate}
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <div className="flex items-center">
              <BookOpen className="mr-2 h-4 w-4" />
              {test.questionCount} questions
            </div>
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              {test.duration} minutes
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className={compact ? 'p-4 pt-0' : 'p-6 pt-0'}>
        <Link href={`/test/${test.id}`}>
          <Button
            className={`w-full ${!compact ? 'mt-2' : ''}`}
            style={{ backgroundColor: subjectColor }}
          >
            Start Test
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}