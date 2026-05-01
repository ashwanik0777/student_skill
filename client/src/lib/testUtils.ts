import { Question, UserAnswer } from "@/types";

/**
 * Format time in seconds to mm:ss format
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

/**
 * Calculate test score based on answers
 */
export function calculateScore(answers: UserAnswer[], questions: Question[]): {
  score: number;
  correctAnswers: number;
} {
  const totalQuestions = questions.length;
  let correctCount = 0;
  
  answers.forEach(answer => {
    if (answer.isCorrect) {
      correctCount++;
    }
  });
  
  const score = Math.round((correctCount / totalQuestions) * 100);
  
  return {
    score,
    correctAnswers: correctCount
  };
}

/**
 * Analyze test performance to identify strengths and weaknesses
 */
export function analyzeTestPerformance(answers: UserAnswer[], questions: Question[]): {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
} {
  // Get all topics covered in the test
  const topicPerformance = new Map<string, { correct: number; total: number }>();
  
  answers.forEach(answer => {
    const question = questions.find(q => q.id === answer.questionId);
    
    if (question) {
      question.topics.forEach(topic => {
        if (!topicPerformance.has(topic)) {
          topicPerformance.set(topic, { correct: 0, total: 0 });
        }
        
        const performance = topicPerformance.get(topic)!;
        
        performance.total++;
        if (answer.isCorrect) {
          performance.correct++;
        }
        
        topicPerformance.set(topic, performance);
      });
    }
  });
  
  // Identify strengths (topics with high performance)
  const strengths: string[] = [];
  // Identify weaknesses (topics with low performance)
  const weaknesses: string[] = [];
  
  topicPerformance.forEach((performance, topic) => {
    const successRate = performance.correct / performance.total;
    
    if (successRate >= 0.8 && performance.total >= 2) {
      strengths.push(topic);
    } else if (successRate <= 0.5 && performance.total >= 2) {
      weaknesses.push(topic);
    }
  });
  
  // Generate recommendations based on weaknesses
  const recommendations: string[] = weaknesses.map(
    weakness => `Practice more ${weakness} questions to improve your understanding.`
  );
  
  // Add general recommendations if needed
  if (recommendations.length === 0 && strengths.length === 0) {
    recommendations.push("Try to improve your time management when taking tests.");
  }
  
  return {
    strengths,
    weaknesses,
    recommendations
  };
}

/**
 * Function to detect if the user is trying to switch tabs or applications
 */
export function setupTabFocusDetection(callback: () => void): () => void {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      callback();
    }
  };
  
  document.addEventListener("visibilitychange", handleVisibilityChange);
  
  // Return cleanup function
  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
