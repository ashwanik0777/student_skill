import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Question } from "@shared/schema";
import { GeneratedQuestion, PerformanceAnalysis, LearningPath } from "@/lib/openai";

interface GenerateQuestionRequest {
  subject: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface GenerateQuestionsRequest {
  subject: string;
  count: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface AnalyzePerformanceRequest {
  testAttemptId: number;
}

export function useGenerateQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: GenerateQuestionRequest) => {
      const response = await apiRequest('/api/ai/generate-question', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const result = await response.json();
      return result as GeneratedQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/questions'] });
    }
  });
}

export function useGenerateQuestions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: GenerateQuestionsRequest) => {
      const response = await apiRequest('/api/ai/generate-questions', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const result = await response.json();
      return result as GeneratedQuestion[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/questions'] });
    }
  });
}

export function useAnalyzePerformance() {
  return useMutation({
    mutationFn: async (data: AnalyzePerformanceRequest) => {
      const response = await apiRequest('/api/ai/analyze-performance', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const result = await response.json();
      return result as PerformanceAnalysis;
    }
  });
}

export function useGenerateLearningPath() {
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/ai/learning-path', {
        method: 'POST',
        body: JSON.stringify({})
      });
      const result = await response.json();
      return result as LearningPath;
    }
  });
}