export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  school?: string;
  grade: string;
  avatar?: string;
  clerkId: string;
}

export interface Subject {
  id: number;
  name: string;
  displayName: string;
  color: string;
  icon: string;
}

export interface Question {
  id: number;
  subjectId: number;
  text: string;
  options: string[];
  correctOption: number;
  explanation: string;
  difficulty: number;
  topics: string[];
}

export interface TestQuestion {
  id: number;
  testId: number;
  questionId: number;
  order: number;
  question: Question;
}

export interface Test {
  id: number;
  title: string;
  description?: string;
  subjectId: number;
  duration: number;
  questionCount: number;
  isSpecial: boolean;
  availableAt: string;
  subject?: Subject;
}

export interface TestAttempt {
  id: number;
  userId: number;
  testId: number;
  startedAt: string;
  completedAt?: string;
  score?: number;
  totalQuestions: number;
  correctAnswers?: number;
  timeTaken?: number;
  test?: Test;
}

export interface UserAnswer {
  id: number;
  testAttemptId: number;
  questionId: number;
  selectedOption?: number;
  isCorrect?: boolean;
  timeSpent?: number;
  question?: Question;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  type: string;
  threshold: number;
  subjectId?: number;
}

export interface UserBadge {
  id: number;
  userId: number;
  badgeId: number;
  earnedAt: string;
  badge: Badge;
}

export interface UserStreak {
  userId: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
}

export interface UserSubjectPerformance {
  id: number;
  userId: number;
  subjectId: number;
  testsCompleted: number;
  averageScore: number;
  totalTimeSpent: number;
  lastTestDate?: string;
  subject: Subject;
}

export interface Milestone {
  id: number;
  name: string;
  description: string;
  type: string;
  threshold: number;
  subjectId?: number;
  icon: string;
}

export interface UserMilestone {
  id: number;
  userId: number;
  milestoneId: number;
  achievedAt: string;
  milestone: Milestone;
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  username: string;
  avatar?: string;
  stats: {
    testsCompleted: number;
    averageScore: number;
    badgeCount: number;
  }
}

export interface TestStatus {
  isStarted: boolean;
  isCompleted: boolean;
  currentQuestion: number;
  timeRemaining: number;
}
