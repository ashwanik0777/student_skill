import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface TestAttempt {
  id: number;
  testId: number;
  score: number | null;
  completedAt: string | null;
  test?: {
    title: string;
  };
}

interface AnalysisResult {
  overall: {
    score: number;
    performance: string;
    strengths: string[];
    areas_for_improvement: string[];
  };
  subjects: {
    [subject: string]: {
      performance: string;
      score: number;
      strengths: string[];
      weaknesses: string[];
      recommended_topics: string[];
    };
  };
  recommendations: {
    study_plan: string;
    practice_suggestions: string[];
  };
}

export function AIPerformanceAnalysis() {
  const [loading, setLoading] = useState(false);
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  // Load test attempts on mount
  useEffect(() => {
    async function fetchTestAttempts() {
      try {
        setLoading(true);
        const response = await apiRequest("/api/user/test-attempts", {
          method: "GET",
        });

        if (response.ok) {
          const data = await response.json();
          // Filter for completed test attempts
          const completedAttempts = data.filter(
            (attempt: TestAttempt) => attempt.completedAt && attempt.score !== null
          );
          setTestAttempts(completedAttempts);
        } else {
          throw new Error("Failed to load test attempts");
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchTestAttempts();
  }, [toast]);

  const analyzePerformance = async () => {
    if (!selectedAttemptId) return;
    
    try {
      setLoading(true);
      const response = await apiRequest("/api/ai/analyze-performance", {
        method: "POST",
        body: JSON.stringify({
          testAttemptId: selectedAttemptId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to analyze performance");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance.toLowerCase()) {
      case "excellent":
        return "bg-green-100 text-green-800";
      case "good":
        return "bg-blue-100 text-blue-800";
      case "average":
        return "bg-yellow-100 text-yellow-800";
      case "needs improvement":
        return "bg-orange-100 text-orange-800";
      case "poor":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Performance Analysis</CardTitle>
          <CardDescription>
            Get detailed insights and personalized recommendations based on your test performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Test Attempt</label>
              <Select
                value={selectedAttemptId?.toString() || ""}
                onValueChange={(value) => setSelectedAttemptId(parseInt(value))}
                disabled={loading || testAttempts.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a test attempt" />
                </SelectTrigger>
                <SelectContent>
                  {testAttempts.map((attempt) => (
                    <SelectItem key={attempt.id} value={attempt.id.toString()}>
                      {attempt.test?.title || `Test #${attempt.testId}`} ({new Date(attempt.completedAt!).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {testAttempts.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground">
                  No completed test attempts found. Complete a test to analyze your performance.
                </p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={analyzePerformance}
            disabled={loading || !selectedAttemptId}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Performance"
            )}
          </Button>
        </CardFooter>
      </Card>

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Analysis</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-medium">Overall Performance:</span>
              <Badge className={getPerformanceColor(analysis.overall.performance)}>
                {analysis.overall.performance}
              </Badge>
              <span className="text-sm font-medium ml-2">Score:</span>
              <Badge variant="outline">{analysis.overall.score}%</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Strengths</h3>
              <ul className="list-disc pl-5 space-y-1">
                {analysis.overall.strengths.map((strength, index) => (
                  <li key={index} className="text-sm">
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Areas for Improvement</h3>
              <ul className="list-disc pl-5 space-y-1">
                {analysis.overall.areas_for_improvement.map((area, index) => (
                  <li key={index} className="text-sm">
                    {area}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Subject Performance</h3>
              <Accordion type="single" collapsible className="w-full">
                {Object.entries(analysis.subjects).map(([subject, data], index) => (
                  <AccordionItem key={index} value={`subject-${index}`}>
                    <AccordionTrigger className="text-base font-medium">
                      <div className="flex items-center gap-2">
                        {subject}
                        <Badge className={getPerformanceColor(data.performance)}>
                          {data.performance}
                        </Badge>
                        <Badge variant="outline">{data.score}%</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Strengths</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {data.strengths.map((strength, idx) => (
                              <li key={idx} className="text-sm">
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Weaknesses</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {data.weaknesses.map((weakness, idx) => (
                              <li key={idx} className="text-sm">
                                {weakness}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Recommended Topics to Review
                          </h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {data.recommended_topics.map((topic, idx) => (
                              <li key={idx} className="text-sm">
                                {topic}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personalized Study Plan</h3>
              <p className="text-sm">{analysis.recommendations.study_plan}</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Practice Suggestions</h3>
              <ul className="list-disc pl-5 space-y-1">
                {analysis.recommendations.practice_suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm">
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}