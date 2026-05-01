import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { TestAttempt, Subject, Test, UserAnswer, Question } from "@/types";
import { useSubjects } from "@/hooks/useSubjects";
import { useTest } from "@/hooks/useTest";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  BookOpen,
  BookText,
  Timer,
} from "lucide-react";
import { AIPerformanceAnalysis } from "@/components/AIPerformanceAnalysis";
import { Skeleton } from "@/components/ui/skeleton";

interface ResultsProps {
  id?: string;
}

export default function Results({ id }: ResultsProps) {
  const [match, params] = useRoute("/results/:id");
  const attemptId = id ? parseInt(id) : match ? parseInt(params.id) : -1;
  const { toast } = useToast();

  // Fetch the test attempt
  const {
    data: attempt,
    isLoading: isAttemptLoading,
    error: attemptError,
  } = useQuery<TestAttempt>({
    queryKey: [`/api/test-attempts/${attemptId}`],
    enabled: attemptId > 0,
  });

  // Fetch the test
  const { test, isLoading: isTestLoading } = useTest(attempt?.testId || 0);

  // Fetch all subjects
  const { data: subjects, isLoading: isSubjectsLoading } = useSubjects();

  // Fetch user answers
  const {
    data: userAnswers,
    isLoading: isAnswersLoading,
    error: answersError,
  } = useQuery<(UserAnswer & { question: Question })[]>({
    queryKey: [`/api/test-attempts/${attemptId}/answers`],
    enabled: attemptId > 0,
  });

  // State for which questions to show
  const [questionFilter, setQuestionFilter] = useState<"all" | "correct" | "incorrect">("all");

  // Get subject of the test
  const subject = subjects?.find(s => s.id === test?.subjectId);
  
  // Format duration in minutes and seconds
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Calculate score color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  // Calculate progress color based on score
  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Filter questions based on current filter
  const filteredAnswers = userAnswers?.filter(answer => {
    if (questionFilter === "all") return true;
    if (questionFilter === "correct") return answer.isCorrect;
    if (questionFilter === "incorrect") return !answer.isCorrect;
    return true;
  });

  // Loading state
  if (isAttemptLoading || isTestLoading || isSubjectsLoading || isAnswersLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-10 w-1/2 mb-4" />
          <Skeleton className="h-64 w-full mb-8" />
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (attemptError || answersError || !attempt || !test || !userAnswers) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Results</h1>
          <p className="text-muted-foreground mb-6">
            There was a problem loading your test results. Please try again.
          </p>
          <Link href="/dashboard">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalQuestions = attempt.totalQuestions;
  const correctAnswers = attempt.correctAnswers || 0;
  const incorrectAnswers = totalQuestions - correctAnswers;
  const score = attempt.score || 0;
  const timeTaken = attempt.timeTaken || 0;
  const averageTimePerQuestion = timeTaken / totalQuestions;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Test Results</h1>
        <h2 className="text-lg text-muted-foreground mb-6">{test.title}</h2>

        {/* Results Summary Card */}
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>
                  {new Date(attempt.completedAt || "").toLocaleString()}
                </CardDescription>
              </div>
              {subject && (
                <Badge
                  style={{ backgroundColor: subject.color }}
                  className="text-white"
                >
                  {subject.displayName}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Score */}
              <div className="space-y-2 text-center p-4 rounded-lg border">
                <h3 className="text-sm font-medium text-muted-foreground">Your Score</h3>
                <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
                  {score}%
                </div>
                <Progress
                  className={`h-2 mt-2 ${getProgressColor(score)}`}
                  value={score}
                />
                <div className="text-sm mt-2">
                  {correctAnswers} out of {totalQuestions} questions correct
                </div>
              </div>

              {/* Statistics */}
              <div className="space-y-4 p-4 rounded-lg border">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <CheckCircle2 className="text-green-500 w-4 h-4 mr-2" />
                      <span className="text-sm text-muted-foreground">Correct</span>
                    </div>
                    <div className="text-xl font-medium">{correctAnswers}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <XCircle className="text-red-500 w-4 h-4 mr-2" />
                      <span className="text-sm text-muted-foreground">Incorrect</span>
                    </div>
                    <div className="text-xl font-medium">{incorrectAnswers}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <Clock className="text-blue-500 w-4 h-4 mr-2" />
                      <span className="text-sm text-muted-foreground">Time Taken</span>
                    </div>
                    <div className="text-xl font-medium">{formatDuration(timeTaken)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <Timer className="text-violet-500 w-4 h-4 mr-2" />
                      <span className="text-sm text-muted-foreground">Avg per Question</span>
                    </div>
                    <div className="text-xl font-medium">
                      {formatDuration(Math.round(averageTimePerQuestion))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0 flex justify-around">
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
            <Link href="/tests">
              <Button>Take Another Test</Button>
            </Link>
          </CardFooter>
        </Card>

        <Tabs defaultValue="answers" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="answers">Answers Review</TabsTrigger>
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          </TabsList>

          {/* Answers Review */}
          <TabsContent value="answers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Answers Review</CardTitle>
                <div className="flex space-x-2 mt-2">
                  <Button
                    variant={questionFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuestionFilter("all")}
                  >
                    All ({userAnswers.length})
                  </Button>
                  <Button
                    variant={questionFilter === "correct" ? "default" : "outline"}
                    size="sm"
                    className="text-green-600"
                    onClick={() => setQuestionFilter("correct")}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Correct ({userAnswers.filter(a => a.isCorrect).length})
                  </Button>
                  <Button
                    variant={questionFilter === "incorrect" ? "default" : "outline"}
                    size="sm"
                    className="text-red-600"
                    onClick={() => setQuestionFilter("incorrect")}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Incorrect ({userAnswers.filter(a => !a.isCorrect).length})
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {filteredAnswers?.map((answer, index) => {
                    const options = typeof answer.question.options === 'string' 
                      ? JSON.parse(answer.question.options) 
                      : (answer.question.options as string[]);
                    return (
                      <AccordionItem
                        key={answer.id}
                        value={answer.id.toString()}
                        className="border rounded-md mb-4 overflow-hidden"
                      >
                        <AccordionTrigger className="px-4 py-2 hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center">
                              <div 
                                className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                  answer.isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                }`}
                              >
                                {answer.isCorrect ? (
                                  <CheckCircle2 className="w-5 h-5" />
                                ) : (
                                  <XCircle className="w-5 h-5" />
                                )}
                              </div>
                              <div className="text-left">
                                <div className="font-medium">Question {index + 1}</div>
                                <div className="text-sm text-muted-foreground truncate max-w-xs md:max-w-md">
                                  {answer.question.text}
                                </div>
                              </div>
                            </div>
                            {answer.timeSpent && (
                              <Badge variant="outline" className="hidden md:flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatDuration(answer.timeSpent)}
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-2 pb-4">
                          <div className="space-y-4">
                            <div>
                              <p className="text-base font-medium mb-3">{answer.question.text}</p>
                              <div className="space-y-2">
                                {options.map((option: string, i: number) => (
                                  <div
                                    key={i}
                                    className={`flex items-center p-3 rounded-md ${
                                      i === answer.question.correctOption
                                        ? "bg-green-50 border border-green-200"
                                        : i === answer.selectedOption && !answer.isCorrect
                                        ? "bg-red-50 border border-red-200"
                                        : "bg-gray-50 border border-gray-200"
                                    }`}
                                  >
                                    <div 
                                      className="w-6 h-6 rounded-full flex items-center justify-center mr-3 text-xs font-medium text-gray-700 bg-white border border-gray-300"
                                    >
                                      {String.fromCharCode(65 + i)}
                                    </div>
                                    <span>{option}</span>
                                    {i === answer.question.correctOption && (
                                      <CheckCircle2 className="w-4 h-4 ml-auto text-green-600" />
                                    )}
                                    {i === answer.selectedOption && !answer.isCorrect && (
                                      <XCircle className="w-4 h-4 ml-auto text-red-600" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {answer.question.explanation && (
                              <div className="bg-blue-50 p-4 rounded-md mt-4">
                                <h4 className="text-sm font-medium text-blue-800 mb-1">Explanation</h4>
                                <p className="text-sm text-blue-700">{answer.question.explanation}</p>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Analysis */}
          <TabsContent value="analysis">
            <AIPerformanceAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}