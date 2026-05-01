import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Test, TestQuestion, TestAttempt, UserAnswer } from "@/types";
import { queryClient } from "@/lib/queryClient";

export function useTest(testId: number) {
  const { data: test, isLoading: isTestLoading } = useQuery<Test>({
    queryKey: [`/api/tests/${testId}`],
    enabled: !!testId,
  });

  const { data: questions, isLoading: isQuestionsLoading } = useQuery<TestQuestion[]>({
    queryKey: [`/api/tests/${testId}/questions`],
    enabled: !!testId,
  });

  return {
    test,
    questions,
    isLoading: isTestLoading || isQuestionsLoading,
  };
}

export function useTestAttempts() {
  return useQuery<TestAttempt[]>({
    queryKey: ["/api/user/test-attempts"],
  });
}

export function useTestAttempt(attemptId: number) {
  const { data: testAttempt, isLoading: isAttemptLoading } = useQuery<TestAttempt>({
    queryKey: [`/api/test-attempts/${attemptId}`],
    enabled: !!attemptId,
  });

  const { data: answers, isLoading: isAnswersLoading } = useQuery<UserAnswer[]>({
    queryKey: [`/api/test-attempts/${attemptId}/answers`],
    enabled: !!attemptId,
  });

  return {
    testAttempt,
    answers,
    isLoading: isAttemptLoading || isAnswersLoading,
  };
}

export function useCreateTestAttempt() {
  return useMutation({
    mutationFn: async (data: { testId: number, totalQuestions: number }) => {
      const res = await apiRequest("POST", "/api/test-attempts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/test-attempts"] });
    },
  });
}

export function useSubmitAnswer() {
  return useMutation({
    mutationFn: async (data: {
      testAttemptId: number;
      questionId: number;
      selectedOption: number;
      isCorrect: boolean;
      timeSpent: number;
    }) => {
      const res = await apiRequest("POST", "/api/user-answers", data);
      return res.json();
    },
  });
}

export function useCompleteTestAttempt() {
  return useMutation({
    mutationFn: async (data: {
      attemptId: number;
      score: number;
      correctAnswers: number;
      timeTaken: number;
    }) => {
      const res = await apiRequest(
        "PUT",
        `/api/test-attempts/${data.attemptId}/complete`,
        {
          score: data.score,
          correctAnswers: data.correctAnswers,
          timeTaken: data.timeTaken,
        }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/test-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/subject-performance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/streak"] });
    },
  });
}
