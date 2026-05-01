import {
  User, InsertUser,
  Subject, InsertSubject,
  Question, InsertQuestion,
  Test, InsertTest,
  TestQuestion, InsertTestQuestion,
  TestAttempt, InsertTestAttempt,
  UserAnswer, InsertUserAnswer,
  Badge, InsertBadge,
  UserBadge, InsertUserBadge,
  UserStreak, InsertUserStreak,
  UserSubjectPerformance, InsertUserSubjectPerformance,
  Milestone, InsertMilestone,
  UserMilestone, InsertUserMilestone
} from "@shared/schema";

export interface IStorage {
  // Users
  getUserById(id: number): Promise<User | undefined>;
  getUserByClerkId(clerkId: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Subjects
  getSubjects(): Promise<Subject[]>;
  getSubjectById(id: number): Promise<Subject | undefined>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  
  // Questions
  getQuestionsBySubject(subjectId: number): Promise<Question[]>;
  getQuestionById(id: number): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  
  // Tests
  getTests(): Promise<Test[]>;
  getTestById(id: number): Promise<Test | undefined>;
  getTestsBySubject(subjectId: number): Promise<Test[]>;
  getAvailableTests(): Promise<Test[]>;
  createTest(test: InsertTest): Promise<Test>;
  
  // Test Questions
  getTestQuestions(testId: number): Promise<(TestQuestion & { question: Question })[]>;
  addQuestionToTest(testQuestion: InsertTestQuestion): Promise<TestQuestion>;
  
  // Test Attempts
  getTestAttemptsByUser(userId: number): Promise<TestAttempt[]>;
  getTestAttempt(id: number): Promise<TestAttempt | undefined>;
  createTestAttempt(testAttempt: InsertTestAttempt): Promise<TestAttempt>;
  completeTestAttempt(id: number, score: number, correctAnswers: number, timeTaken: number): Promise<TestAttempt>;
  
  // User Answers
  getUserAnswers(testAttemptId: number): Promise<(UserAnswer & { question: Question })[]>;
  saveUserAnswer(userAnswer: InsertUserAnswer): Promise<UserAnswer>;
  
  // Badges
  getBadges(): Promise<Badge[]>;
  getBadgeById(id: number): Promise<Badge | undefined>;
  createBadge(badge: InsertBadge): Promise<Badge>;
  
  // User Badges
  getUserBadges(userId: number): Promise<(UserBadge & { badge: Badge })[]>;
  awardBadgeToUser(userBadge: InsertUserBadge): Promise<UserBadge>;
  
  // User Streaks
  getUserStreak(userId: number): Promise<UserStreak | undefined>;
  updateUserStreak(userId: number, currentStreak: number, longestStreak: number): Promise<UserStreak>;
  
  // User Subject Performance
  getUserSubjectPerformance(userId: number): Promise<(UserSubjectPerformance & { subject: Subject })[]>;
  updateUserSubjectPerformance(userId: number, subjectId: number, stats: Partial<InsertUserSubjectPerformance>): Promise<UserSubjectPerformance>;
  
  // Milestones
  getMilestones(): Promise<Milestone[]>;
  getMilestoneById(id: number): Promise<Milestone | undefined>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  
  // User Milestones
  getUserMilestones(userId: number): Promise<(UserMilestone & { milestone: Milestone })[]>;
  awardMilestoneToUser(userMilestone: InsertUserMilestone): Promise<UserMilestone>;
  
  // Leaderboard
  getLeaderboard(): Promise<(User & { stats: { testsCompleted: number, averageScore: number, badgeCount: number } })[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private subjects: Map<number, Subject>;
  private questions: Map<number, Question>;
  private tests: Map<number, Test>;
  private testQuestions: Map<number, TestQuestion>;
  private testAttempts: Map<number, TestAttempt>;
  private userAnswers: Map<number, UserAnswer>;
  private badges: Map<number, Badge>;
  private userBadges: Map<number, UserBadge>;
  private userStreaks: Map<number, UserStreak>;
  private userSubjectPerformance: Map<number, UserSubjectPerformance>;
  private milestones: Map<number, Milestone>;
  private userMilestones: Map<number, UserMilestone>;
  
  private currentIds: {
    users: number;
    subjects: number;
    questions: number;
    tests: number;
    testQuestions: number;
    testAttempts: number;
    userAnswers: number;
    badges: number;
    userBadges: number;
    userStreaks: number;
    userSubjectPerformance: number;
    milestones: number;
    userMilestones: number;
  };

  constructor() {
    this.users = new Map();
    this.subjects = new Map();
    this.questions = new Map();
    this.tests = new Map();
    this.testQuestions = new Map();
    this.testAttempts = new Map();
    this.userAnswers = new Map();
    this.badges = new Map();
    this.userBadges = new Map();
    this.userStreaks = new Map();
    this.userSubjectPerformance = new Map();
    this.milestones = new Map();
    this.userMilestones = new Map();
    
    this.currentIds = {
      users: 1,
      subjects: 1,
      questions: 1,
      tests: 1,
      testQuestions: 1,
      testAttempts: 1,
      userAnswers: 1,
      badges: 1,
      userBadges: 1,
      userStreaks: 1,
      userSubjectPerformance: 1,
      milestones: 1,
      userMilestones: 1
    };
    
    // Initialize with default subjects
    this.initializeSubjects();
  }
  
  private initializeSubjects() {
    const defaultSubjects: InsertSubject[] = [
      { name: "mathematics", displayName: "Mathematics", color: "blue", icon: "calculate" },
      { name: "physics", displayName: "Physics", color: "purple", icon: "science" },
      { name: "chemistry", displayName: "Chemistry", color: "pink", icon: "biotech" },
      { name: "biology", displayName: "Biology", color: "emerald", icon: "psychiatry" },
      { name: "english", displayName: "English", color: "amber", icon: "menu_book" },
      { name: "social", displayName: "Social Science", color: "red", icon: "public" }
    ];
    
    defaultSubjects.forEach(subject => {
      this.createSubject(subject);
    });
  }

  // Users
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByClerkId(clerkId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.clerkId === clerkId);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const newUser: User = { 
      ...user, 
      id, 
      createdAt: new Date(),
      role: user.role || 'student',
      school: user.school || null,
      grade: user.grade || null,
      avatar: user.avatar || null,
      clerkId: user.clerkId || null,
      profilePicture: user.profilePicture || null
    };
    this.users.set(id, newUser);
    return newUser;
  }
  
  // Subjects
  async getSubjects(): Promise<Subject[]> {
    return Array.from(this.subjects.values());
  }
  
  async getSubjectById(id: number): Promise<Subject | undefined> {
    return this.subjects.get(id);
  }
  
  async createSubject(subject: InsertSubject): Promise<Subject> {
    const id = this.currentIds.subjects++;
    const newSubject: Subject = { ...subject, id };
    this.subjects.set(id, newSubject);
    return newSubject;
  }
  
  // Questions
  async getQuestionsBySubject(subjectId: number): Promise<Question[]> {
    return Array.from(this.questions.values()).filter(
      question => question.subjectId === subjectId
    );
  }
  
  async getQuestionById(id: number): Promise<Question | undefined> {
    return this.questions.get(id);
  }
  
  async createQuestion(question: InsertQuestion): Promise<Question> {
    const id = this.currentIds.questions++;
    const newQuestion: Question = { ...question, id, createdAt: new Date() };
    this.questions.set(id, newQuestion);
    return newQuestion;
  }
  
  // Tests
  async getTests(): Promise<Test[]> {
    return Array.from(this.tests.values());
  }
  
  async getTestById(id: number): Promise<Test | undefined> {
    return this.tests.get(id);
  }
  
  async getTestsBySubject(subjectId: number): Promise<Test[]> {
    return Array.from(this.tests.values()).filter(
      test => test.subjectId === subjectId
    );
  }
  
  async getAvailableTests(): Promise<Test[]> {
    const now = new Date();
    return Array.from(this.tests.values()).filter(
      test => test.availableAt <= now
    );
  }
  
  async createTest(test: InsertTest): Promise<Test> {
    const id = this.currentIds.tests++;
    const newTest: Test = { 
      ...test, 
      id, 
      createdAt: new Date(),
      description: test.description || null,
      isSpecial: test.isSpecial || null
    };
    this.tests.set(id, newTest);
    return newTest;
  }
  
  // Test Questions
  async getTestQuestions(testId: number): Promise<(TestQuestion & { question: Question })[]> {
    const testQuestionsForTest = Array.from(this.testQuestions.values()).filter(
      tq => tq.testId === testId
    );
    
    return testQuestionsForTest.map(tq => {
      const question = this.questions.get(tq.questionId);
      if (!question) throw new Error(`Question with ID ${tq.questionId} not found`);
      return { ...tq, question };
    }).sort((a, b) => a.order - b.order);
  }
  
  async addQuestionToTest(testQuestion: InsertTestQuestion): Promise<TestQuestion> {
    const id = this.currentIds.testQuestions++;
    const newTestQuestion: TestQuestion = { ...testQuestion, id };
    this.testQuestions.set(id, newTestQuestion);
    return newTestQuestion;
  }
  
  // Test Attempts
  async getTestAttemptsByUser(userId: number): Promise<TestAttempt[]> {
    return Array.from(this.testAttempts.values()).filter(
      attempt => attempt.userId === userId
    );
  }
  
  async getTestAttempt(id: number): Promise<TestAttempt | undefined> {
    return this.testAttempts.get(id);
  }
  
  async createTestAttempt(testAttempt: InsertTestAttempt): Promise<TestAttempt> {
    const id = this.currentIds.testAttempts++;
    const newTestAttempt: TestAttempt = { 
      ...testAttempt, 
      id, 
      startedAt: new Date(),
      completedAt: null,
      score: null,
      correctAnswers: null,
      timeTaken: null
    };
    this.testAttempts.set(id, newTestAttempt);
    return newTestAttempt;
  }
  
  async completeTestAttempt(id: number, score: number, correctAnswers: number, timeTaken: number): Promise<TestAttempt> {
    const testAttempt = this.testAttempts.get(id);
    if (!testAttempt) throw new Error(`Test attempt with ID ${id} not found`);
    
    const updatedAttempt: TestAttempt = {
      ...testAttempt,
      completedAt: new Date(),
      score,
      correctAnswers,
      timeTaken
    };
    
    this.testAttempts.set(id, updatedAttempt);
    return updatedAttempt;
  }
  
  // User Answers
  async getUserAnswers(testAttemptId: number): Promise<(UserAnswer & { question: Question })[]> {
    const userAnswersForAttempt = Array.from(this.userAnswers.values()).filter(
      answer => answer.testAttemptId === testAttemptId
    );
    
    return userAnswersForAttempt.map(answer => {
      const question = this.questions.get(answer.questionId);
      if (!question) throw new Error(`Question with ID ${answer.questionId} not found`);
      return { ...answer, question };
    });
  }
  
  async saveUserAnswer(userAnswer: InsertUserAnswer): Promise<UserAnswer> {
    const id = this.currentIds.userAnswers++;
    const newUserAnswer: UserAnswer = { 
      ...userAnswer, 
      id,
      selectedOption: userAnswer.selectedOption || null,
      isCorrect: userAnswer.isCorrect || null,
      timeSpent: userAnswer.timeSpent || null
    };
    this.userAnswers.set(id, newUserAnswer);
    return newUserAnswer;
  }
  
  // Badges
  async getBadges(): Promise<Badge[]> {
    return Array.from(this.badges.values());
  }
  
  async getBadgeById(id: number): Promise<Badge | undefined> {
    return this.badges.get(id);
  }
  
  async createBadge(badge: InsertBadge): Promise<Badge> {
    const id = this.currentIds.badges++;
    const newBadge: Badge = { 
      ...badge, 
      id,
      subjectId: badge.subjectId || null
    };
    this.badges.set(id, newBadge);
    return newBadge;
  }
  
  // User Badges
  async getUserBadges(userId: number): Promise<(UserBadge & { badge: Badge })[]> {
    const userBadgesForUser = Array.from(this.userBadges.values()).filter(
      ub => ub.userId === userId
    );
    
    return userBadgesForUser.map(ub => {
      const badge = this.badges.get(ub.badgeId);
      if (!badge) throw new Error(`Badge with ID ${ub.badgeId} not found`);
      return { ...ub, badge };
    });
  }
  
  async awardBadgeToUser(userBadge: InsertUserBadge): Promise<UserBadge> {
    const id = this.currentIds.userBadges++;
    const newUserBadge: UserBadge = { ...userBadge, id, earnedAt: new Date() };
    this.userBadges.set(id, newUserBadge);
    return newUserBadge;
  }
  
  // User Streaks
  async getUserStreak(userId: number): Promise<UserStreak | undefined> {
    return Array.from(this.userStreaks.values()).find(
      us => us.userId === userId
    );
  }
  
  async updateUserStreak(userId: number, currentStreak: number, longestStreak: number): Promise<UserStreak> {
    const existingStreak = await this.getUserStreak(userId);
    
    if (existingStreak) {
      const updatedStreak: UserStreak = {
        ...existingStreak,
        currentStreak,
        longestStreak,
        lastActivityDate: new Date()
      };
      this.userStreaks.set(existingStreak.id, updatedStreak);
      return updatedStreak;
    } else {
      const id = this.currentIds.userStreaks++;
      const newStreak: UserStreak = {
        id,
        userId,
        currentStreak,
        longestStreak,
        lastActivityDate: new Date()
      };
      this.userStreaks.set(id, newStreak);
      return newStreak;
    }
  }
  
  // User Subject Performance
  async getUserSubjectPerformance(userId: number): Promise<(UserSubjectPerformance & { subject: Subject })[]> {
    const performances = Array.from(this.userSubjectPerformance.values()).filter(
      usp => usp.userId === userId
    );
    
    return performances.map(performance => {
      const subject = this.subjects.get(performance.subjectId);
      if (!subject) throw new Error(`Subject with ID ${performance.subjectId} not found`);
      return { ...performance, subject };
    });
  }
  
  async updateUserSubjectPerformance(userId: number, subjectId: number, stats: Partial<InsertUserSubjectPerformance>): Promise<UserSubjectPerformance> {
    const existingPerformance = Array.from(this.userSubjectPerformance.values()).find(
      usp => usp.userId === userId && usp.subjectId === subjectId
    );
    
    if (existingPerformance) {
      const updatedPerformance: UserSubjectPerformance = {
        ...existingPerformance,
        ...stats,
        lastTestDate: new Date()
      };
      this.userSubjectPerformance.set(existingPerformance.id, updatedPerformance);
      return updatedPerformance;
    } else {
      const id = this.currentIds.userSubjectPerformance++;
      const newPerformance: UserSubjectPerformance = {
        id,
        userId,
        subjectId,
        testsCompleted: stats.testsCompleted || 0,
        averageScore: stats.averageScore || 0,
        totalTimeSpent: stats.totalTimeSpent || 0,
        lastTestDate: new Date()
      };
      this.userSubjectPerformance.set(id, newPerformance);
      return newPerformance;
    }
  }
  
  // Milestones
  async getMilestones(): Promise<Milestone[]> {
    return Array.from(this.milestones.values());
  }
  
  async getMilestoneById(id: number): Promise<Milestone | undefined> {
    return this.milestones.get(id);
  }
  
  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const id = this.currentIds.milestones++;
    const newMilestone: Milestone = { 
      ...milestone, 
      id,
      subjectId: milestone.subjectId || null
    };
    this.milestones.set(id, newMilestone);
    return newMilestone;
  }
  
  // User Milestones
  async getUserMilestones(userId: number): Promise<(UserMilestone & { milestone: Milestone })[]> {
    const userMilestonesForUser = Array.from(this.userMilestones.values()).filter(
      um => um.userId === userId
    );
    
    return userMilestonesForUser.map(um => {
      const milestone = this.milestones.get(um.milestoneId);
      if (!milestone) throw new Error(`Milestone with ID ${um.milestoneId} not found`);
      return { ...um, milestone };
    });
  }
  
  async awardMilestoneToUser(userMilestone: InsertUserMilestone): Promise<UserMilestone> {
    const id = this.currentIds.userMilestones++;
    const newUserMilestone: UserMilestone = { 
      ...userMilestone, 
      id, 
      achievedAt: new Date()
    };
    this.userMilestones.set(id, newUserMilestone);
    return newUserMilestone;
  }
  
  // Leaderboard
  async getLeaderboard(): Promise<(User & { stats: { testsCompleted: number, averageScore: number, badgeCount: number } })[]> {
    const users = Array.from(this.users.values());
    
    // Calculate stats for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
      // Get total tests completed
      const testAttempts = Array.from(this.testAttempts.values()).filter(
        ta => ta.userId === user.id && ta.completedAt !== null
      );
      
      const testsCompleted = testAttempts.length;
      
      // Calculate average score
      let totalScore = 0;
      testAttempts.forEach(attempt => {
        if (attempt.score !== null) {
          totalScore += attempt.score;
        }
      });
      const averageScore = testsCompleted > 0 ? Math.round(totalScore / testsCompleted) : 0;
      
      // Count badges
      const userBadges = Array.from(this.userBadges.values()).filter(
        ub => ub.userId === user.id
      );
      
      return {
        ...user,
        stats: {
          testsCompleted,
          averageScore,
          badgeCount: userBadges.length
        }
      };
    }));
    
    // Sort by average score (descending)
    return usersWithStats.sort((a, b) => b.stats.averageScore - a.stats.averageScore);
  }
}

import { MongoDbStorage } from './storage/mongoDb';
import { PostgresStorage } from './storage/postgres';
import mongoose from 'mongoose';
import { log } from './vite';

// Create the storage instance
let storageInstance: IStorage;

// Function to determine and get the storage implementation
export function getStorage(): IStorage {
  // If storageInstance is already set, return it
  if (storageInstance) {
    return storageInstance;
  }
  
  // Determine which storage to use based on env and connection states
  const usePostgres = process.env.DATABASE_URL && process.env.USE_POSTGRES === 'true';
  const useMongoDB = process.env.MONGODB_URI && mongoose.connection.readyState === 1;
  
  if (usePostgres) {
    log('Using PostgreSQL storage', 'storage');
    storageInstance = new PostgresStorage();
  } else if (useMongoDB) {
    log('Using MongoDB storage', 'storage');
    storageInstance = new MongoDbStorage();
  } else {
    log('Using in-memory storage', 'storage');
    storageInstance = new MemStorage();
  }
  
  return storageInstance;
}

// Dynamically get the storage implementation using a proxy to forward all calls
export const storage: IStorage = new Proxy({} as IStorage, {
  get: function(target, prop) {
    return getStorage()[prop as keyof IStorage];
  }
});
