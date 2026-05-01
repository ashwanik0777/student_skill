import { useState } from "react";
import { useSubjects } from "@/hooks/useSubjects";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { chaptersData } from "../lib/subjectsData";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ChapterTestGenerator() {
  const { data: subjects, isLoading: isSubjectsLoading } = useSubjects();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(30);
  const [duration, setDuration] = useState<number>(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  // Get chapters for the selected subject
  const availableChapters = selectedSubject 
    ? (chaptersData[subjects?.find(s => s.id.toString() === selectedSubject)?.displayName || ""] || []) 
    : [];

  // Handle generating instant test
  const handleGenerateTest = async () => {
    if (!selectedSubject || !selectedChapter) {
      toast({
        title: "Missing information",
        description: "Please select both subject and chapter",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsGenerating(true);
      
      // Call the API to generate an instant chapter test
      const response = await apiRequest("/api/instant-chapter-test", {
        method: "POST",
        body: JSON.stringify({
          subjectId: parseInt(selectedSubject),
          chapter: selectedChapter,
          questionCount,
          duration
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Test generated successfully!",
          description: "Your chapter test is ready to take."
        });
        
        // Invalidate tests cache to show the new test
        queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
        
        // Navigate to the test page
        setLocation(`/test/${result.test.id}`);
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate test");
      }
    } catch (error: any) {
      toast({
        title: "Error generating test",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isSubjectsLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">Loading...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generate Chapter Test</CardTitle>
        <CardDescription>
          Select a subject and chapter to instantly generate a customized test
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject</label>
            <Select 
              value={selectedSubject} 
              onValueChange={value => {
                setSelectedSubject(value);
                setSelectedChapter(""); // Reset chapter selection when subject changes
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects?.map(subject => (
                  <SelectItem key={subject.id} value={subject.id.toString()}>
                    {subject.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Chapter</label>
            <Select 
              value={selectedChapter} 
              onValueChange={setSelectedChapter}
              disabled={!selectedSubject || availableChapters.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedSubject 
                    ? "Select a subject first" 
                    : availableChapters.length === 0 
                      ? "No chapters available" 
                      : "Select a chapter"
                } />
              </SelectTrigger>
              <SelectContent>
                {availableChapters.map((chapter: string) => (
                  <SelectItem key={chapter} value={chapter}>
                    {chapter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Number of Questions</label>
              <span className="text-sm text-muted-foreground">{questionCount} questions</span>
            </div>
            <Slider
              value={[questionCount]}
              min={5}
              max={50}
              step={1}
              onValueChange={values => setQuestionCount(values[0])}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Test Duration</label>
              <span className="text-sm text-muted-foreground">{duration} minutes</span>
            </div>
            <Slider
              value={[duration]}
              min={5}
              max={180}
              step={5}
              onValueChange={values => setDuration(values[0])}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleGenerateTest}
          disabled={!selectedSubject || !selectedChapter || isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Test...
            </>
          ) : (
            "Generate Test Now"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}