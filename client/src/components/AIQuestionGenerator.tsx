import { useState } from "react";
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

interface AIQuestionGeneratorProps {
  testId?: number;
  subjectId?: number;
  onComplete?: () => void;
}

export function AIQuestionGenerator({
  testId,
  subjectId,
  onComplete,
}: AIQuestionGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateQuestions = async () => {
    try {
      setIsGenerating(true);
      
      let endpoint = '';
      
      if (testId) {
        endpoint = `/api/admin/generate-test-questions/${testId}`;
      } else if (subjectId) {
        endpoint = `/api/admin/generate-subject-questions/${subjectId}`;
      } else {
        toast({
          title: "Error",
          description: "No test or subject selected for question generation",
          variant: "destructive",
        });
        return;
      }
      
      const response = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        toast({
          title: "Success!",
          description: "Questions generated successfully",
        });
        
        if (onComplete) {
          onComplete();
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate questions");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>AI Question Generator</CardTitle>
        <CardDescription>
          Generate chapter-specific questions using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {testId
              ? "This will generate questions for the selected test."
              : "This will generate questions for all tests in the selected subject."}
          </p>
          <p className="text-sm font-medium mt-4">
            This process may take several minutes as the AI generates high-quality questions. Please be patient.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleGenerateQuestions}
          disabled={isGenerating || (!testId && !subjectId)}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Questions"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

interface AIQuestionControlProps {
  onGenerateComplete?: () => void;
}

export function AIQuestionControl({ onGenerateComplete }: AIQuestionControlProps) {
  const [selectedType, setSelectedType] = useState<"test" | "subject">("test");
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const [tests, setTests] = useState<{ id: number; title: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: number; displayName: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load tests and subjects
  const loadOptions = async () => {
    try {
      setLoading(true);
      
      // Load tests
      const testsResponse = await apiRequest("/api/tests", {
        method: "GET",
      });
      if (testsResponse.ok) {
        const testsData = await testsResponse.json();
        setTests(testsData);
      }

      // Load subjects
      const subjectsResponse = await apiRequest("/api/subjects", {
        method: "GET",
      });
      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json();
        setSubjects(subjectsData);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load options",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load options on component mount
  useState(() => {
    loadOptions();
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI Question Generator</CardTitle>
        <CardDescription>
          Generate questions for tests or entire subjects
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Generation Type</label>
          <Select
            value={selectedType}
            onValueChange={(value) => {
              setSelectedType(value as "test" | "subject");
              setSelectedId(undefined);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="test">Single Test</SelectItem>
              <SelectItem value="subject">Entire Subject</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedType === "test" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Test</label>
            <Select
              value={selectedId?.toString()}
              onValueChange={(value) => setSelectedId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a test" />
              </SelectTrigger>
              <SelectContent>
                {tests.map((test) => (
                  <SelectItem key={test.id} value={test.id.toString()}>
                    {test.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedType === "subject" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Subject</label>
            <Select
              value={selectedId?.toString()}
              onValueChange={(value) => setSelectedId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id.toString()}>
                    {subject.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <AIQuestionGenerator
          testId={selectedType === "test" ? selectedId : undefined}
          subjectId={selectedType === "subject" ? selectedId : undefined}
          onComplete={onGenerateComplete}
        />
      </CardFooter>
    </Card>
  );
}