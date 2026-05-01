import { IStorage } from '../storage';
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
} from '../../shared/schema';

import {
  UserModel,
  SubjectModel,
  QuestionModel,
  TestModel,
  TestQuestionModel,
  TestAttemptModel,
  UserAnswerModel,
  BadgeModel,
  UserBadgeModel,
  UserStreakModel,
  UserSubjectPerformanceModel,
  MilestoneModel,
  UserMilestoneModel
} from '../models';
import { log } from '../vite';

export class MongoDbStorage implements IStorage {
  // Users
  async getUserById(id: number): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ id }).lean();
      return user as User;
    } catch (error) {
      log(`Error in getUserById: ${error}`, 'mongodb');
      return undefined;
    }
  }

  async getUserByClerkId(clerkId: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ clerkId }).lean();
      return user as User;
    } catch (error) {
      log(`Error in getUserByClerkId: ${error}`, 'mongodb');
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ username }).lean();
      return user as User;
    } catch (error) {
      log(`Error in getUserByUsername: ${error}`, 'mongodb');
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      // Find the highest id to determine next id
      const highestUser = await UserModel.findOne().sort({ id: -1 }).lean();
      const id = highestUser ? (highestUser.id + 1) : 1;
      
      const newUser = new UserModel({
        ...user,
        id,
        createdAt: new Date()
      });
      
      await newUser.save();
      return newUser.toObject() as User;
    } catch (error) {
      log(`Error in createUser: ${error}`, 'mongodb');
      throw error;
    }
  }

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    try {
      const subjects = await SubjectModel.find().lean();
      return subjects as Subject[];
    } catch (error) {
      log(`Error in getSubjects: ${error}`, 'mongodb');
      return [];
    }
  }

  async getSubjectById(id: number): Promise<Subject | undefined> {
    try {
      const subject = await SubjectModel.findOne({ id }).lean();
      return subject as Subject;
    } catch (error) {
      log(`Error in getSubjectById: ${error}`, 'mongodb');
      return undefined;
    }
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    try {
      // Find the highest id to determine next id
      const highestSubject = await SubjectModel.findOne().sort({ id: -1 }).lean();
      const id = highestSubject ? (highestSubject.id + 1) : 1;
      
      const newSubject = new SubjectModel({
        ...subject,
        id
      });
      
      await newSubject.save();
      return newSubject.toObject() as Subject;
    } catch (error) {
      log(`Error in createSubject: ${error}`, 'mongodb');
      throw error;
    }
  }

  // Questions
  async getQuestionsBySubject(subjectId: number): Promise<Question[]> {
    try {
      const questions = await QuestionModel.find({ subjectId }).lean();
      return questions as Question[];
    } catch (error) {
      log(`Error in getQuestionsBySubject: ${error}`, 'mongodb');
      return [];
    }
  }

  async getQuestionById(id: number): Promise<Question | undefined> {
    try {
      const question = await QuestionModel.findOne({ id }).lean();
      return question as Question;
    } catch (error) {
      log(`Error in getQuestionById: ${error}`, 'mongodb');
      return undefined;
    }
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    try {
      // Find the highest id to determine next id
      const highestQuestion = await QuestionModel.findOne().sort({ id: -1 }).lean();
      const id = highestQuestion ? (highestQuestion.id + 1) : 1;
      
      const newQuestion = new QuestionModel({
        ...question,
        id,
        createdAt: new Date()
      });
      
      await newQuestion.save();
      return newQuestion.toObject() as Question;
    } catch (error) {
      log(`Error in createQuestion: ${error}`, 'mongodb');
      throw error;
    }
  }

  // Tests
  async getTests(): Promise<Test[]> {
    try {
      const tests = await TestModel.find().lean();
      return tests as Test[];
    } catch (error) {
      log(`Error in getTests: ${error}`, 'mongodb');
      return [];
    }
  }

  async getTestById(id: number): Promise<Test | undefined> {
    try {
      const test = await TestModel.findOne({ id }).lean();
      return test as Test;
    } catch (error) {
      log(`Error in getTestById: ${error}`, 'mongodb');
      return undefined;
    }
  }

  async getTestsBySubject(subjectId: number): Promise<Test[]> {
    try {
      const tests = await TestModel.find({ subjectId }).lean();
      return tests as Test[];
    } catch (error) {
      log(`Error in getTestsBySubject: ${error}`, 'mongodb');
      return [];
    }
  }

  async getAvailableTests(): Promise<Test[]> {
    try {
      // This is simplified; in a real app you might have date logic here
      const tests = await TestModel.find().lean();
      return tests as Test[];
    } catch (error) {
      log(`Error in getAvailableTests: ${error}`, 'mongodb');
      return [];
    }
  }

  async createTest(test: InsertTest): Promise<Test> {
    try {
      // Find the highest id to determine next id
      const highestTest = await TestModel.findOne().sort({ id: -1 }).lean();
      const id = highestTest ? (highestTest.id + 1) : 1;
      
      const newTest = new TestModel({
        ...test,
        id,
        createdAt: new Date()
      });
      
      await newTest.save();
      return newTest.toObject() as Test;
    } catch (error) {
      log(`Error in createTest: ${error}`, 'mongodb');
      throw error;
    }
  }

  // Test Questions
  async getTestQuestions(testId: number): Promise<(TestQuestion & { question: Question })[]> {
    try {
      const testQuestions = await TestQuestionModel.find({ testId }).lean();
      
      const result: (TestQuestion & { question: Question })[] = [];
      
      for (const tq of testQuestions) {
        const question = await this.getQuestionById(tq.questionId);
        if (question) {
          result.push({
            ...tq,
            question
          } as TestQuestion & { question: Question });
        }
      }
      
      return result;
    } catch (error) {
      log(`Error in getTestQuestions: ${error}`, 'mongodb');
      return [];
    }
  }

  async addQuestionToTest(testQuestion: InsertTestQuestion): Promise<TestQuestion> {
    try {
      // Find the highest id to determine next id
      const highestTestQuestion = await TestQuestionModel.findOne().sort({ id: -1 }).lean();
      const id = highestTestQuestion ? (highestTestQuestion.id + 1) : 1;
      
      const newTestQuestion = new TestQuestionModel({
        ...testQuestion,
        id
      });
      
      await newTestQuestion.save();
      return newTestQuestion.toObject() as TestQuestion;
    } catch (error) {
      log(`Error in addQuestionToTest: ${error}`, 'mongodb');
      throw error;
    }
  }

  // Test Attempts
  async getTestAttemptsByUser(userId: number): Promise<TestAttempt[]> {
    try {
      const testAttempts = await TestAttemptModel.find({ userId }).lean();
      return testAttempts as TestAttempt[];
    } catch (error) {
      log(`Error in getTestAttemptsByUser: ${error}`, 'mongodb');
      return [];
    }
  }

  async getTestAttempt(id: number): Promise<TestAttempt | undefined> {
    try {
      const testAttempt = await TestAttemptModel.findOne({ id }).lean();
      return testAttempt as TestAttempt;
    } catch (error) {
      log(`Error in getTestAttempt: ${error}`, 'mongodb');
      return undefined;
    }
  }

  async createTestAttempt(testAttempt: InsertTestAttempt): Promise<TestAttempt> {
    try {
      // Find the highest id to determine next id
      const highestTestAttempt = await TestAttemptModel.findOne().sort({ id: -1 }).lean();
      const id = highestTestAttempt ? (highestTestAttempt.id + 1) : 1;
      
      const newTestAttempt = new TestAttemptModel({
        ...testAttempt,
        id,
        startedAt: new Date()
      });
      
      await newTestAttempt.save();
      return newTestAttempt.toObject() as TestAttempt;
    } catch (error) {
      log(`Error in createTestAttempt: ${error}`, 'mongodb');
      throw error;
    }
  }

  async completeTestAttempt(id: number, score: number, correctAnswers: number, timeTaken: number): Promise<TestAttempt> {
    try {
      const testAttempt = await TestAttemptModel.findOne({ id });
      
      if (!testAttempt) {
        throw new Error(`Test attempt with id ${id} not found`);
      }
      
      testAttempt.completedAt = new Date();
      testAttempt.score = score;
      testAttempt.correctAnswers = correctAnswers;
      testAttempt.timeTaken = timeTaken;
      
      await testAttempt.save();
      return testAttempt.toObject() as TestAttempt;
    } catch (error) {
      log(`Error in completeTestAttempt: ${error}`, 'mongodb');
      throw error;
    }
  }

  // User Answers
  async getUserAnswers(testAttemptId: number): Promise<(UserAnswer & { question: Question })[]> {
    try {
      const userAnswers = await UserAnswerModel.find({ testAttemptId }).lean();
      
      const result: (UserAnswer & { question: Question })[] = [];
      
      for (const ua of userAnswers) {
        const question = await this.getQuestionById(ua.questionId);
        if (question) {
          result.push({
            ...ua,
            question
          } as UserAnswer & { question: Question });
        }
      }
      
      return result;
    } catch (error) {
      log(`Error in getUserAnswers: ${error}`, 'mongodb');
      return [];
    }
  }

  async saveUserAnswer(userAnswer: InsertUserAnswer): Promise<UserAnswer> {
    try {
      // Find the highest id to determine next id
      const highestUserAnswer = await UserAnswerModel.findOne().sort({ id: -1 }).lean();
      const id = highestUserAnswer ? (highestUserAnswer.id + 1) : 1;
      
      const newUserAnswer = new UserAnswerModel({
        ...userAnswer,
        id
      });
      
      await newUserAnswer.save();
      return newUserAnswer.toObject() as UserAnswer;
    } catch (error) {
      log(`Error in saveUserAnswer: ${error}`, 'mongodb');
      throw error;
    }
  }

  // Badges
  async getBadges(): Promise<Badge[]> {
    try {
      const badges = await BadgeModel.find().lean();
      return badges as Badge[];
    } catch (error) {
      log(`Error in getBadges: ${error}`, 'mongodb');
      return [];
    }
  }

  async getBadgeById(id: number): Promise<Badge | undefined> {
    try {
      const badge = await BadgeModel.findOne({ id }).lean();
      return badge as Badge;
    } catch (error) {
      log(`Error in getBadgeById: ${error}`, 'mongodb');
      return undefined;
    }
  }

  async createBadge(badge: InsertBadge): Promise<Badge> {
    try {
      // Find the highest id to determine next id
      const highestBadge = await BadgeModel.findOne().sort({ id: -1 }).lean();
      const id = highestBadge ? (highestBadge.id + 1) : 1;
      
      const newBadge = new BadgeModel({
        ...badge,
        id
      });
      
      await newBadge.save();
      return newBadge.toObject() as Badge;
    } catch (error) {
      log(`Error in createBadge: ${error}`, 'mongodb');
      throw error;
    }
  }

  // User Badges
  async getUserBadges(userId: number): Promise<(UserBadge & { badge: Badge })[]> {
    try {
      const userBadges = await UserBadgeModel.find({ userId }).lean();
      
      const result: (UserBadge & { badge: Badge })[] = [];
      
      for (const ub of userBadges) {
        const badge = await this.getBadgeById(ub.badgeId);
        if (badge) {
          result.push({
            ...ub,
            badge
          } as UserBadge & { badge: Badge });
        }
      }
      
      return result;
    } catch (error) {
      log(`Error in getUserBadges: ${error}`, 'mongodb');
      return [];
    }
  }

  async awardBadgeToUser(userBadge: InsertUserBadge): Promise<UserBadge> {
    try {
      // Check if user already has this badge
      const existingBadge = await UserBadgeModel.findOne({
        userId: userBadge.userId,
        badgeId: userBadge.badgeId
      });
      
      if (existingBadge) {
        return existingBadge.toObject() as UserBadge;
      }
      
      // Find the highest id to determine next id
      const highestUserBadge = await UserBadgeModel.findOne().sort({ id: -1 }).lean();
      const id = highestUserBadge ? (highestUserBadge.id + 1) : 1;
      
      const newUserBadge = new UserBadgeModel({
        ...userBadge,
        id,
        earnedAt: new Date()
      });
      
      await newUserBadge.save();
      return newUserBadge.toObject() as UserBadge;
    } catch (error) {
      log(`Error in awardBadgeToUser: ${error}`, 'mongodb');
      throw error;
    }
  }

  // User Streaks
  async getUserStreak(userId: number): Promise<UserStreak | undefined> {
    try {
      const userStreak = await UserStreakModel.findOne({ userId }).lean();
      return userStreak as UserStreak;
    } catch (error) {
      log(`Error in getUserStreak: ${error}`, 'mongodb');
      return undefined;
    }
  }

  async updateUserStreak(userId: number, currentStreak: number, longestStreak: number): Promise<UserStreak> {
    try {
      let userStreak = await UserStreakModel.findOne({ userId });
      
      if (userStreak) {
        userStreak.currentStreak = currentStreak;
        userStreak.longestStreak = longestStreak;
        userStreak.lastActivityDate = new Date();
        
        await userStreak.save();
        return userStreak.toObject() as UserStreak;
      } else {
        // Find the highest id to determine next id
        const highestUserStreak = await UserStreakModel.findOne().sort({ id: -1 }).lean();
        const id = highestUserStreak ? (highestUserStreak.id + 1) : 1;
        
        const newUserStreak = new UserStreakModel({
          userId,
          id,
          currentStreak,
          longestStreak,
          lastActivityDate: new Date()
        });
        
        await newUserStreak.save();
        return newUserStreak.toObject() as UserStreak;
      }
    } catch (error) {
      log(`Error in updateUserStreak: ${error}`, 'mongodb');
      throw error;
    }
  }

  // User Subject Performance
  async getUserSubjectPerformance(userId: number): Promise<(UserSubjectPerformance & { subject: Subject })[]> {
    try {
      const performances = await UserSubjectPerformanceModel.find({ userId }).lean();
      
      const result: (UserSubjectPerformance & { subject: Subject })[] = [];
      
      for (const performance of performances) {
        const subject = await this.getSubjectById(performance.subjectId);
        if (subject) {
          result.push({
            ...performance,
            subject
          } as UserSubjectPerformance & { subject: Subject });
        }
      }
      
      return result;
    } catch (error) {
      log(`Error in getUserSubjectPerformance: ${error}`, 'mongodb');
      return [];
    }
  }

  async updateUserSubjectPerformance(userId: number, subjectId: number, stats: Partial<InsertUserSubjectPerformance>): Promise<UserSubjectPerformance> {
    try {
      let performance = await UserSubjectPerformanceModel.findOne({ userId, subjectId });
      
      if (performance) {
        if (stats.testsCompleted !== undefined) performance.testsCompleted = stats.testsCompleted;
        if (stats.questionsAnswered !== undefined) performance.questionsAnswered = stats.questionsAnswered;
        if (stats.questionsCorrect !== undefined) performance.questionsCorrect = stats.questionsCorrect;
        if (stats.averageScore !== undefined) performance.averageScore = stats.averageScore;
        performance.lastImprovement = new Date();
        
        await performance.save();
        return performance.toObject() as UserSubjectPerformance;
      } else {
        // Find the highest id to determine next id
        const highestPerformance = await UserSubjectPerformanceModel.findOne().sort({ id: -1 }).lean();
        const id = highestPerformance ? (highestPerformance.id + 1) : 1;
        
        const newPerformance = new UserSubjectPerformanceModel({
          userId,
          subjectId,
          id,
          testsCompleted: stats.testsCompleted || 0,
          questionsAnswered: stats.questionsAnswered || 0,
          questionsCorrect: stats.questionsCorrect || 0,
          averageScore: stats.averageScore || 0,
          lastImprovement: new Date()
        });
        
        await newPerformance.save();
        return newPerformance.toObject() as UserSubjectPerformance;
      }
    } catch (error) {
      log(`Error in updateUserSubjectPerformance: ${error}`, 'mongodb');
      throw error;
    }
  }

  // Milestones
  async getMilestones(): Promise<Milestone[]> {
    try {
      const milestones = await MilestoneModel.find().lean();
      return milestones as Milestone[];
    } catch (error) {
      log(`Error in getMilestones: ${error}`, 'mongodb');
      return [];
    }
  }

  async getMilestoneById(id: number): Promise<Milestone | undefined> {
    try {
      const milestone = await MilestoneModel.findOne({ id }).lean();
      return milestone as Milestone;
    } catch (error) {
      log(`Error in getMilestoneById: ${error}`, 'mongodb');
      return undefined;
    }
  }

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    try {
      // Find the highest id to determine next id
      const highestMilestone = await MilestoneModel.findOne().sort({ id: -1 }).lean();
      const id = highestMilestone ? (highestMilestone.id + 1) : 1;
      
      const newMilestone = new MilestoneModel({
        ...milestone,
        id
      });
      
      await newMilestone.save();
      return newMilestone.toObject() as Milestone;
    } catch (error) {
      log(`Error in createMilestone: ${error}`, 'mongodb');
      throw error;
    }
  }

  // User Milestones
  async getUserMilestones(userId: number): Promise<(UserMilestone & { milestone: Milestone })[]> {
    try {
      const userMilestones = await UserMilestoneModel.find({ userId }).lean();
      
      const result: (UserMilestone & { milestone: Milestone })[] = [];
      
      for (const um of userMilestones) {
        const milestone = await this.getMilestoneById(um.milestoneId);
        if (milestone) {
          result.push({
            ...um,
            milestone
          } as UserMilestone & { milestone: Milestone });
        }
      }
      
      return result;
    } catch (error) {
      log(`Error in getUserMilestones: ${error}`, 'mongodb');
      return [];
    }
  }

  async awardMilestoneToUser(userMilestone: InsertUserMilestone): Promise<UserMilestone> {
    try {
      // Check if user already has this milestone
      const existingMilestone = await UserMilestoneModel.findOne({
        userId: userMilestone.userId,
        milestoneId: userMilestone.milestoneId
      });
      
      if (existingMilestone) {
        existingMilestone.progress = userMilestone.progress;
        await existingMilestone.save();
        return existingMilestone.toObject() as UserMilestone;
      }
      
      // Find the highest id to determine next id
      const highestUserMilestone = await UserMilestoneModel.findOne().sort({ id: -1 }).lean();
      const id = highestUserMilestone ? (highestUserMilestone.id + 1) : 1;
      
      const newUserMilestone = new UserMilestoneModel({
        ...userMilestone,
        id,
        achievedAt: new Date()
      });
      
      await newUserMilestone.save();
      return newUserMilestone.toObject() as UserMilestone;
    } catch (error) {
      log(`Error in awardMilestoneToUser: ${error}`, 'mongodb');
      throw error;
    }
  }

  // Leaderboard
  async getLeaderboard(): Promise<(User & { stats: { testsCompleted: number, averageScore: number, badgeCount: number } })[]> {
    try {
      const users = await UserModel.find().lean();
      
      const leaderboard: (User & { stats: { testsCompleted: number, averageScore: number, badgeCount: number } })[] = [];
      
      for (const user of users) {
        // Get user test attempts
        const testAttempts = await TestAttemptModel.find({ 
          userId: user.id, 
          completedAt: { $exists: true } 
        }).lean();
        
        // Count completed tests
        const testsCompleted = testAttempts.length;
        
        // Calculate average score
        let totalScore = 0;
        for (const attempt of testAttempts) {
          totalScore += attempt.score || 0;
        }
        const averageScore = testsCompleted > 0 ? totalScore / testsCompleted : 0;
        
        // Count badges
        const userBadges = await UserBadgeModel.find({ userId: user.id }).lean();
        const badgeCount = userBadges.length;
        
        leaderboard.push({
          ...user,
          stats: {
            testsCompleted,
            averageScore,
            badgeCount
          }
        } as User & { stats: { testsCompleted: number, averageScore: number, badgeCount: number } });
      }
      
      // Sort by average score (descending)
      leaderboard.sort((a, b) => b.stats.averageScore - a.stats.averageScore);
      
      return leaderboard;
    } catch (error) {
      log(`Error in getLeaderboard: ${error}`, 'mongodb');
      return [];
    }
  }
}