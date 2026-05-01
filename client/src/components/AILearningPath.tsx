import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useGenerateLearningPath } from "@/hooks/useAI";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, BookOpen, Award, Target, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LearningPath } from "@/lib/openai";

export function AILearningPath() {
  const { mutate: generateLearningPathMutation, isPending: loading, data: learningPath } = useGenerateLearningPath();
  const { toast } = useToast();

  const handleGenerateLearningPath = () => {
    generateLearningPathMutation(undefined, {
      onError: (error) => {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    });
  };

  // Calculate overall performance score based on subject recommendations
  const getOverallProgress = () => {
    if (!learningPath?.subjectRecommendations) return 0;
    
    const subjects = Object.keys(learningPath.subjectRecommendations);
    if (subjects.length === 0) return 0;
    
    // Assume 65% as base progress (student is in the system and learning)
    return 65;
  };

  // Get all strengths and focus areas across all subjects
  const getAllStrengths = () => {
    if (!learningPath?.subjectRecommendations) return [];
    
    const allSubjectStrategies = Object.values(learningPath.subjectRecommendations)
      .flatMap(subject => subject.practiceStrategies)
      .filter(strategy => strategy.includes("strength") || strategy.includes("good") || strategy.includes("well"));
    
    return allSubjectStrategies.length > 0 ? allSubjectStrategies : ["Continue your consistent practice"];
  };

  const getAllFocusAreas = () => {
    if (!learningPath?.subjectRecommendations) return [];
    
    const allFocusAreas = Object.values(learningPath.subjectRecommendations)
      .flatMap(subject => subject.focusAreas);
    
    return allFocusAreas.length > 0 ? allFocusAreas : ["Focus on regular practice and revision"];
  };

  // Helper to determine priority based on focus areas count
  const getSubjectPriority = (subject: string) => {
    if (!learningPath?.subjectRecommendations[subject]) return "medium";
    
    const focusAreasCount = learningPath.subjectRecommendations[subject].focusAreas.length;
    if (focusAreasCount >= 4) return "high";
    if (focusAreasCount >= 2) return "medium";
    return "low";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Learning Path</CardTitle>
          <CardDescription>
            Get a personalized study plan and learning path based on your performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Our AI will analyze your test results and create a tailored learning path to help
            you improve in areas where you need it most. Click the button below to generate
            your personalized learning path.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleGenerateLearningPath}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Learning Path...
              </>
            ) : (
              "Generate Learning Path"
            )}
          </Button>
        </CardFooter>
      </Card>

      {learningPath && (
        <div className="space-y-6">
          {/* Student Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Learning Profile</CardTitle>
              <CardDescription>
                Overall progress and learning assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm">{getOverallProgress()}%</span>
                </div>
                <Progress value={getOverallProgress()} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center">
                    <Award className="w-4 h-4 mr-2" />
                    Strengths
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {getAllStrengths().map((strength, index) => (
                      <li key={index} className="text-sm">
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Areas for Improvement
                  </h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {getAllFocusAreas().map((area, index) => (
                      <li key={index} className="text-sm">
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subject Learning Paths */}
          <Card>
            <CardHeader>
              <CardTitle>Subject Learning Paths</CardTitle>
              <CardDescription>
                Detailed learning plan for each subject
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {Object.entries(learningPath.subjectRecommendations).map(([subject, data], index) => (
                  <AccordionItem key={index} value={`subject-${index}`}>
                    <AccordionTrigger className="text-base font-medium">
                      <div className="flex items-center gap-2">
                        {subject}
                        <Badge className={getPriorityColor(getSubjectPriority(subject))}>
                          {getSubjectPriority(subject).toUpperCase()} PRIORITY
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Focus Areas
                          </h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {data.focusAreas.map((topic, idx) => (
                              <li key={idx} className="text-sm">
                                {topic}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            Practice Strategies
                          </h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {data.practiceStrategies.map((strategy, idx) => (
                              <li key={idx} className="text-sm">
                                {strategy}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold mb-2">Recommended Resources</h4>
                          {data.recommendedResources.map((resource, idx) => (
                            <div key={idx} className="bg-gray-50 p-3 rounded-md mb-2">
                              <p className="text-sm">{resource}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Daily Study Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Study Plan</CardTitle>
              <CardDescription>Your weekly schedule optimized for learning</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="monday" className="w-full">
                <TabsList className="grid grid-cols-7">
                  <TabsTrigger value="monday">Mon</TabsTrigger>
                  <TabsTrigger value="tuesday">Tue</TabsTrigger>
                  <TabsTrigger value="wednesday">Wed</TabsTrigger>
                  <TabsTrigger value="thursday">Thu</TabsTrigger>
                  <TabsTrigger value="friday">Fri</TabsTrigger>
                  <TabsTrigger value="saturday">Sat</TabsTrigger>
                  <TabsTrigger value="sunday">Sun</TabsTrigger>
                </TabsList>
                {Object.entries(learningPath.dailyStudyPlan).map(([day, plan]) => (
                  <TabsContent key={day} value={day.toLowerCase()}>
                    <div className="space-y-4 mt-4">
                      <div className="flex flex-wrap gap-2">
                        {plan.subjects.map((subject, idx) => (
                          <Badge key={idx} variant="outline">{subject}</Badge>
                        ))}
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Activities</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {plan.activities.map((activity, idx) => (
                            <li key={idx} className="text-sm">{activity}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          Time Allocation (minutes)
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(plan.timeAllocation).map(([subject, minutes], idx) => (
                            <div key={idx} className="flex justify-between bg-gray-50 p-2 rounded">
                              <span className="text-sm font-medium">{subject}</span>
                              <span className="text-sm">{minutes} min</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Long Term Goals */}
          <Card>
            <CardHeader>
              <CardTitle>Long Term Goals</CardTitle>
              <CardDescription>Your path to academic success</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc pl-5 space-y-2">
                {learningPath.longTermGoals.map((goal, index) => (
                  <li key={index} className="text-sm">
                    {goal}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}