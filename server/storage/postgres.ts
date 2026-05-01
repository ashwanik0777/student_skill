import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { IStorage } from '../storage';
import {
  users, subjects, questions, tests, testQuestions, testAttempts,
  userAnswers, badges, userBadges, userStreaks, userSubjectPerformance,
  milestones, userMilestones,
  type User, type InsertUser,
  type Subject, type InsertSubject,
  type Question, type InsertQuestion,
  type Test, type InsertTest,
  type TestQuestion, type InsertTestQuestion,
  type TestAttempt, type InsertTestAttempt,
  type UserAnswer, type InsertUserAnswer,
  type Badge, type InsertBadge,
  type UserBadge, type InsertUserBadge,
  type UserStreak, type InsertUserStreak,
  type UserSubjectPerformance, type InsertUserSubjectPerformance,
  type Milestone, type InsertMilestone,
  type UserMilestone, type InsertUserMilestone
} from '../../shared/schema';
import { log } from '../vite';

export class PostgresStorage implements IStorage {
  // Users
  async getUserById(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByClerkId(clerkId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.clerkId, clerkId));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    return await db.select().from(subjects);
  }

  async getSubjectById(id: number): Promise<Subject | undefined> {
    const result = await db.select().from(subjects).where(eq(subjects.id, id));
    return result[0];
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const result = await db.insert(subjects).values(subject).returning();
    return result[0];
  }

  // Questions
  async getQuestionsBySubject(subjectId: number): Promise<Question[]> {
    return await db.select().from(questions).where(eq(questions.subjectId, subjectId));
  }

  async getQuestionById(id: number): Promise<Question | undefined> {
    const result = await db.select().from(questions).where(eq(questions.id, id));
    return result[0];
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const result = await db.insert(questions).values(question).returning();
    return result[0];
  }

  // Tests
  async getTests(): Promise<Test[]> {
    return await db.select().from(tests);
  }

  async getTestById(id: number): Promise<Test | undefined> {
    const result = await db.select().from(tests).where(eq(tests.id, id));
    return result[0];
  }

  async getTestsBySubject(subjectId: number): Promise<Test[]> {
    return await db.select().from(tests).where(eq(tests.subjectId, subjectId));
  }

  async getAvailableTests(): Promise<Test[]> {
    // Get all tests and filter by date manually
    const now = new Date();
    const allTests = await db.select().from(tests);
    
    // Filter tests that are available (availableAt <= current date)
    return allTests.filter(test => {
      return test.availableAt <= now;
    });
  }

  async createTest(test: InsertTest): Promise<Test> {
    const result = await db.insert(tests).values(test).returning();
    return result[0];
  }

  // Test Questions
  async getTestQuestions(testId: number): Promise<(TestQuestion & { question: Question })[]> {
    const testQs = await db.select()
      .from(testQuestions)
      .where(eq(testQuestions.testId, testId))
      .orderBy(testQuestions.order);

    const result: (TestQuestion & { question: Question })[] = [];
    
    for (const tq of testQs) {
      const q = await this.getQuestionById(tq.questionId);
      if (q) {
        result.push({
          ...tq,
          question: q
        });
      }
    }
    
    return result;
  }

  async addQuestionToTest(testQuestion: InsertTestQuestion): Promise<TestQuestion> {
    const result = await db.insert(testQuestions).values(testQuestion).returning();
    return result[0];
  }

  // Test Attempts
  async getTestAttemptsByUser(userId: number): Promise<TestAttempt[]> {
    return await db.select()
      .from(testAttempts)
      .where(eq(testAttempts.userId, userId))
      .orderBy(desc(testAttempts.startedAt));
  }

  async getTestAttempt(id: number): Promise<TestAttempt | undefined> {
    const result = await db.select().from(testAttempts).where(eq(testAttempts.id, id));
    return result[0];
  }

  async createTestAttempt(attempt: InsertTestAttempt): Promise<TestAttempt> {
    const testAttemptData = {
      ...attempt,
      startedAt: new Date()
    };
    
    const result = await db.insert(testAttempts).values(testAttemptData).returning();
    return result[0];
  }

  async completeTestAttempt(id: number, score: number, correctAnswers: number, timeTaken: number): Promise<TestAttempt> {
    const result = await db.update(testAttempts)
      .set({
        completedAt: new Date(),
        score,
        correctAnswers,
        timeTaken
      })
      .where(eq(testAttempts.id, id))
      .returning();
      
    return result[0];
  }

  // User Answers
  async getUserAnswers(testAttemptId: number): Promise<(UserAnswer & { question: Question })[]> {
    const answers = await db.select()
      .from(userAnswers)
      .where(eq(userAnswers.testAttemptId, testAttemptId));

    const result: (UserAnswer & { question: Question })[] = [];
    
    for (const answer of answers) {
      const q = await this.getQuestionById(answer.questionId);
      if (q) {
        result.push({
          ...answer,
          question: q
        });
      }
    }
    
    return result;
  }

  async saveUserAnswer(answer: InsertUserAnswer): Promise<UserAnswer> {
    const result = await db.insert(userAnswers).values(answer).returning();
    return result[0];
  }

  // Badges
  async getBadges(): Promise<Badge[]> {
    return await db.select().from(badges);
  }

  async getBadgeById(id: number): Promise<Badge | undefined> {
    const result = await db.select().from(badges).where(eq(badges.id, id));
    return result[0];
  }

  async createBadge(badge: InsertBadge): Promise<Badge> {
    const result = await db.insert(badges).values(badge).returning();
    return result[0];
  }

  // User Badges
  async getUserBadges(userId: number): Promise<(UserBadge & { badge: Badge })[]> {
    const userBadgesList = await db.select()
      .from(userBadges)
      .where(eq(userBadges.userId, userId));

    const result: (UserBadge & { badge: Badge })[] = [];
    
    for (const ub of userBadgesList) {
      const badge = await this.getBadgeById(ub.badgeId);
      if (badge) {
        result.push({
          ...ub,
          badge
        });
      }
    }
    
    return result;
  }

  async awardBadgeToUser(userBadge: InsertUserBadge): Promise<UserBadge> {
    const badgeData = {
      ...userBadge,
      earnedAt: new Date()
    };
    
    const result = await db.insert(userBadges).values(badgeData).returning();
    return result[0];
  }

  // User Streaks
  async getUserStreak(userId: number): Promise<UserStreak | undefined> {
    const result = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId));
    return result[0];
  }

  async updateUserStreak(userId: number, currentStreak: number, longestStreak: number): Promise<UserStreak> {
    const existing = await this.getUserStreak(userId);
    
    if (existing) {
      const result = await db.update(userStreaks)
        .set({
          currentStreak,
          longestStreak,
          lastActivityDate: new Date()
        })
        .where(eq(userStreaks.userId, userId))
        .returning();
        
      return result[0];
    } else {
      const result = await db.insert(userStreaks)
        .values({
          userId,
          currentStreak,
          longestStreak,
          lastActivityDate: new Date()
        })
        .returning();
        
      return result[0];
    }
  }

  // User Subject Performance
  async getUserSubjectPerformance(userId: number): Promise<(UserSubjectPerformance & { subject: Subject })[]> {
    const performances = await db.select()
      .from(userSubjectPerformance)
      .where(eq(userSubjectPerformance.userId, userId));

    const result: (UserSubjectPerformance & { subject: Subject })[] = [];
    
    for (const perf of performances) {
      const subject = await this.getSubjectById(perf.subjectId);
      if (subject) {
        result.push({
          ...perf,
          subject
        });
      }
    }
    
    return result;
  }

  async updateUserSubjectPerformance(
    userId: number, 
    subjectId: number, 
    stats: Partial<InsertUserSubjectPerformance>
  ): Promise<UserSubjectPerformance> {
    const existing = await db.select()
      .from(userSubjectPerformance)
      .where(
        and(
          eq(userSubjectPerformance.userId, userId),
          eq(userSubjectPerformance.subjectId, subjectId)
        )
      );
    
    if (existing.length > 0) {
      const result = await db.update(userSubjectPerformance)
        .set({
          ...stats,
          lastTestDate: new Date()
        })
        .where(
          and(
            eq(userSubjectPerformance.userId, userId),
            eq(userSubjectPerformance.subjectId, subjectId)
          )
        )
        .returning();
        
      return result[0];
    } else {
      const result = await db.insert(userSubjectPerformance)
        .values({
          userId,
          subjectId,
          ...stats,
          lastTestDate: new Date()
        })
        .returning();
        
      return result[0];
    }
  }

  // Milestones
  async getMilestones(): Promise<Milestone[]> {
    return await db.select().from(milestones);
  }

  async getMilestoneById(id: number): Promise<Milestone | undefined> {
    const result = await db.select().from(milestones).where(eq(milestones.id, id));
    return result[0];
  }

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const result = await db.insert(milestones).values(milestone).returning();
    return result[0];
  }

  // User Milestones
  async getUserMilestones(userId: number): Promise<(UserMilestone & { milestone: Milestone })[]> {
    const userMilestonesList = await db.select()
      .from(userMilestones)
      .where(eq(userMilestones.userId, userId));

    const result: (UserMilestone & { milestone: Milestone })[] = [];
    
    for (const um of userMilestonesList) {
      const milestone = await this.getMilestoneById(um.milestoneId);
      if (milestone) {
        result.push({
          ...um,
          milestone
        });
      }
    }
    
    return result;
  }

  async awardMilestoneToUser(userMilestone: InsertUserMilestone): Promise<UserMilestone> {
    const milestoneData = {
      ...userMilestone,
      achievedAt: new Date()
    };
    
    const result = await db.insert(userMilestones).values(milestoneData).returning();
    return result[0];
  }

  // Leaderboard
  async getLeaderboard(): Promise<(User & { stats: { testsCompleted: number, averageScore: number, badgeCount: number } })[]> {
    const allUsers = await db.select().from(users);
    const leaderboardData: (User & { stats: { testsCompleted: number, averageScore: number, badgeCount: number } })[] = [];
    
    for (const user of allUsers) {
      // Get test attempts
      const attempts = await db.select()
        .from(testAttempts)
        .where(eq(testAttempts.userId, user.id));
      
      const completedAttempts = attempts.filter(a => a.completedAt !== null);
      
      // Get badges
      const badges = await db.select()
        .from(userBadges)
        .where(eq(userBadges.userId, user.id));
      
      // Calculate stats
      const testsCompleted = completedAttempts.length;
      const totalScore = completedAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
      const averageScore = testsCompleted > 0 ? totalScore / testsCompleted : 0;
      const badgeCount = badges.length;
      
      leaderboardData.push({
        ...user,
        stats: {
          testsCompleted,
          averageScore,
          badgeCount
        }
      });
    }
    
    // Sort by average score
    return leaderboardData.sort((a, b) => b.stats.averageScore - a.stats.averageScore);
  }
}