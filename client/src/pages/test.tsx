import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useTest, useCreateTestAttempt, useSubmitAnswer, useCompleteTestAttempt } from "@/hooks/useTest";
import { useUser } from "@/hooks/useUser";
import { useSubject } from "@/hooks/useSubjects";
import { setupTabFocusDetection } from "@/lib/testUtils";
import { useToast } from "@/hooks/use-toast";
import { UserAnswer } from "@/types";

import TestTimer from "@/components/test/TestTimer";
import QuestionDisplay from "@/components/test/QuestionDisplay";
import QuestionNavigator from "@/components/test/QuestionNavigator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface TestProps {
  id?: string;
}

export default function Test({ id }: TestProps) {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/test/:id");
  const testId = id ? parseInt(id) : match ? parseInt(params.id) : -1;
  
  const { user } = useUser();
  const { test, questions, isLoading } = useTest(testId);
  const { data: subject } = useSubject(test?.subjectId || 0);
  
  const { toast } = useToast();
  
  // Test state
  const [testAttemptId, setTestAttemptId] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | undefined>(undefined);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { mutate: createTestAttempt } = useCreateTestAttempt();
  const { mutate: submitAnswer } = useSubmitAnswer();
  const { mutate: completeTestAttempt } = useCompleteTestAttempt();
  
  // Initialize test
  useEffect(() => {
    if (test && questions && !testAttemptId && user) {
      createTestAttempt(
        { 
          testId: test.id, 
          totalQuestions: questions.length 
        },
        {
          onSuccess: (data) => {
            setTestAttemptId(data.id);
            setQuestionStartTime(Date.now());
          },
          onError: () => {
            toast({
              title: "Error",
              description: "Failed to start test. Please try again.",
              variant: "destructive"
            });
            navigate("/");
          }
        }
      );
    }
  }, [test, questions, user, testAttemptId, createTestAttempt, toast, navigate]);
  
  // Handle tab/window visibility change
  useEffect(() => {
    if (!testAttemptId) return;
    
    const cleanup = setupTabFocusDetection(() => {
      toast({
        title: "Test auto-submitted",
        description: "You navigated away from the test. Your test has been submitted.",
        variant: "destructive"
      });
      handleSubmitTest();
    });
    
    return cleanup;
  }, [testAttemptId, userAnswers]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Handle time up
  const handleTimeUp = () => {
    toast({
      title: "Time's up!",
      description: "Your test has been automatically submitted.",
      variant: "default"
    });
    handleSubmitTest();
  };
  
  // Handle answer selection
  const handleAnswer = (selected: number) => {
    if (!testAttemptId || !questions) return;
    
    const currentQuestion = questions[currentQuestionIndex].question;
    const isCorrect = selected === currentQuestion.correctOption;
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    
    setSelectedOption(selected);
    setHasAnswered(true);
    
    // Add to answered questions
    if (!answeredQuestions.includes(currentQuestionIndex)) {
      setAnsweredQuestions([...answeredQuestions, currentQuestionIndex]);
    }
    
    // Save answer
    const answer = {
      testAttemptId,
      questionId: currentQuestion.id,
      selectedOption: selected,
      isCorrect,
      timeSpent
    };
    
    submitAnswer(answer, {
      onSuccess: (data) => {
        setUserAnswers([...userAnswers, data]);
        
        // Auto-advance to next question after 2 seconds
        setTimeout(() => {
          if (currentQuestionIndex < questions.length - 1) {
            handleNextQuestion();
          }
        }, 2000);
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to submit answer. Please try again.",
          variant: "destructive"
        });
      }
    });
  };
  
  // Navigation handlers
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setQuestionStartTime(Date.now());
      resetQuestionState();
    }
  };
  
  const handleNextQuestion = () => {
    if (questions && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuestionStartTime(Date.now());
      resetQuestionState();
    }
  };
  
  const handleNavigateToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setQuestionStartTime(Date.now());
    resetQuestionState();
  };
  
  const resetQuestionState = () => {
    setSelectedOption(undefined);
    setHasAnswered(false);
  };
  
  // Get current selected option for this question if already answered
  useEffect(() => {
    if (questions) {
      const currentQuestionId = questions[currentQuestionIndex]?.question.id;
      const existingAnswer = userAnswers.find(a => a.questionId === currentQuestionId);
      
      if (existingAnswer) {
        setSelectedOption(existingAnswer.selectedOption);
        setHasAnswered(true);
      } else {
        setSelectedOption(undefined);
        setHasAnswered(false);
      }
    }
  }, [currentQuestionIndex, questions, userAnswers]);
  
  // Submit test
  const handleSubmitTest = () => {
    if (!testAttemptId || !questions || isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Calculate score
    const correctAnswers = userAnswers.filter(a => a.isCorrect).length;
    const score = Math.round((correctAnswers / questions.length) * 100);
    const totalTimeTaken = userAnswers.reduce((total, answer) => total + (answer.timeSpent || 0), 0);
    
    completeTestAttempt(
      {
        attemptId: testAttemptId,
        score,
        correctAnswers,
        timeTaken: totalTimeTaken
      },
      {
        onSuccess: (data) => {
          navigate(`/results/${data.id}`);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to submit test. Please try again.",
            variant: "destructive"
          });
          setIsSubmitting(false);
        }
      }
    );
  };
  
  // Loading state
  if (isLoading || !test || !questions || !subject) {
    return (
      <div className="p-4">
        <div className="bg-gray-100 h-16 w-full mb-4 rounded animate-pulse"></div>
        <div className="bg-gray-100 h-64 w-full rounded animate-pulse"></div>
      </div>
    );
  }
  
  const subjectColor = subject.color;
  const currentQuestion = questions[currentQuestionIndex]?.question;
  
  return (
    <div className="bg-white min-h-screen -mt-16 -mb-20 md:-mb-4">
      {/* Test Header */}
      <div className={`bg-${subjectColor} p-4 text-white`}>
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">{test.title}</h1>
            <div className="flex items-center">
              <TestTimer
                duration={test.duration}
                onTimeUp={handleTimeUp}
              />
              <Button
                onClick={handleSubmitTest}
                className="p-2 bg-white text-blue-600 rounded-lg font-medium"
                disabled={isSubmitting}
              >
                Submit Test
              </Button>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="mr-4">Question {currentQuestionIndex + 1} of {questions.length}</span>
            <div className="w-full bg-white bg-opacity-20 rounded-full h-1.5">
              <div
                className="bg-white h-1.5 rounded-full"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Test Content */}
      <div className="container mx-auto p-4 md:p-6">
        {currentQuestion ? (
          <QuestionDisplay
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            onAnswer={handleAnswer}
            subjectColor={subjectColor}
            hasAnswered={hasAnswered}
            selectedOption={selectedOption}
          />
        ) : (
          <Skeleton className="h-64 w-full" />
        )}
        
        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            variant="outline"
            className="px-4 py-2 border border-gray-300 rounded-lg flex items-center hover:bg-gray-50"
          >
            <span className="material-icons mr-1">arrow_back</span>
            Previous
          </Button>
          
          <Button
            onClick={handleNextQuestion}
            disabled={currentQuestionIndex === questions.length - 1}
            className={`px-4 py-2 bg-${subjectColor} text-white rounded-lg flex items-center hover:bg-${subjectColor}/90`}
          >
            Next
            <span className="material-icons ml-1">arrow_forward</span>
          </Button>
        </div>
        
        {/* Question Navigator */}
        <QuestionNavigator
          totalQuestions={questions.length}
          currentQuestion={currentQuestionIndex}
          answeredQuestions={answeredQuestions}
          onNavigate={handleNavigateToQuestion}
          subjectColor={subjectColor}
        />
      </div>
    </div>
  );
}
