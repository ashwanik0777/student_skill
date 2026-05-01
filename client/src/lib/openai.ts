import { apiRequest } from "@/lib/queryClient";

// Define interfaces for AI-generated content
export interface GeneratedQuestion {
  text: string;
  options: string[];
  correctOption: number;
  explanation: string;
  topic?: string;
  difficulty?: string;
}

export interface PerformanceAnalysis {
  overall: {
    score: number;
    strengths: string[];
    weaknesses: string[];
    timeEfficiency: string;
  };
  subjectBreakdown: {
    [subject: string]: {
      score: number;
      strengths: string[];
      weaknesses: string[];
    };
  };
  recommendations: string[];
}

export interface LearningPath {
  subjectRecommendations: {
    [subject: string]: {
      focusAreas: string[];
      recommendedResources: string[];
      practiceStrategies: string[];
    };
  };
  dailyStudyPlan: {
    [day: string]: {
      subjects: string[];
      activities: string[];
      timeAllocation: { [subject: string]: number };
    };
  };
  longTermGoals: string[];
}

// Generate a single question based on subject and difficulty
export async function generateQuestion(subject: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<GeneratedQuestion> {
  try {
    const response = await apiRequest('/api/ai/generate-question', {
      method: 'POST',
      body: JSON.stringify({ subject, difficulty })
    });
    const data = await response.json();
    return data as GeneratedQuestion;
  } catch (error) {
    console.error('Error generating question:', error);
    throw error;
  }
}

// Generate multiple questions based on subject, count, and difficulty
export async function generateQuestions(subject: string, count: number, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<GeneratedQuestion[]> {
  try {
    const response = await apiRequest('/api/ai/generate-questions', {
      method: 'POST',
      body: JSON.stringify({ subject, count, difficulty })
    });
    const data = await response.json();
    return data as GeneratedQuestion[];
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
}

// Analyze test performance to provide personalized feedback
export async function analyzePerformance(testAttemptId: number): Promise<PerformanceAnalysis> {
  try {
    const response = await apiRequest('/api/ai/analyze-performance', {
      method: 'POST',
      body: JSON.stringify({ testAttemptId })
    });
    const data = await response.json();
    return data as PerformanceAnalysis;
  } catch (error) {
    console.error('Error analyzing performance:', error);
    throw error;
  }
}

// Generate personalized learning path based on user performance
export async function generateLearningPath(): Promise<LearningPath> {
  try {
    const response = await apiRequest('/api/ai/learning-path', {
      method: 'POST',
      body: JSON.stringify({})
    });
    const data = await response.json();
    return data as LearningPath;
  } catch (error) {
    console.error('Error generating learning path:', error);
    throw error;
  }
}