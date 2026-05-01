import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertTestAttemptSchema, 
  insertUserAnswerSchema, 
  insertTestSchema, 
  insertQuestionSchema,
  testQuestions as testQuestionsTable, 
  tests as testsTable,
  questions as questionsTable
} from "@shared/schema";
import { generateQuestion, generateQuestions, analyzePerformance, generateLearningPath } from "./lib/openai";
import { generateChapterTestInstantly } from "./lib/questionGenerator";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { setupAuth } from "./auth";
import { setupClerkAuth } from "./clerkAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);
  
  // Set up Clerk authentication
  setupClerkAuth(app);
  
  const router = express.Router();
  
  // Middleware to check if user is authenticated
  const isAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  };
  
  // User Routes
  router.get("/users/current", async (req, res) => {
    const clerkId = req.headers['x-clerk-user-id'] as string;
    
    if (!clerkId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUserByClerkId(clerkId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  });

  router.post("/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Subjects Routes
  router.get("/subjects", async (req, res) => {
    const subjects = await storage.getSubjects();
    res.json(subjects);
  });

  router.get("/subjects/:id", async (req, res) => {
    const subjectId = parseInt(req.params.id);
    const subject = await storage.getSubjectById(subjectId);
    
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    
    res.json(subject);
  });

  // Tests Routes
  router.get("/tests", async (req, res) => {
    const tests = await storage.getAvailableTests();
    res.json(tests);
  });

  router.get("/tests/:id", async (req, res) => {
    const testId = parseInt(req.params.id);
    const test = await storage.getTestById(testId);
    
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }
    
    res.json(test);
  });

  router.get("/tests/subject/:subjectId", async (req, res) => {
    const subjectId = parseInt(req.params.subjectId);
    const tests = await storage.getTestsBySubject(subjectId);
    res.json(tests);
  });

  // Test Questions Routes
  router.get("/tests/:id/questions", async (req, res) => {
    const testId = parseInt(req.params.id);
    const questions = await storage.getTestQuestions(testId);
    res.json(questions);
  });

  // Test Attempts Routes
  router.post("/test-attempts", async (req, res) => {
    try {
      const clerkId = req.headers['x-clerk-user-id'] as string;
      
      if (!clerkId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
  
      const user = await storage.getUserByClerkId(clerkId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const testAttemptData = insertTestAttemptSchema.parse({
        ...req.body,
        userId: user.id
      });
      
      const testAttempt = await storage.createTestAttempt(testAttemptData);
      res.status(201).json(testAttempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  router.put("/test-attempts/:id/complete", async (req, res) => {
    try {
      const attemptId = parseInt(req.params.id);
      const { score, correctAnswers, timeTaken } = req.body;
      
      const validateBody = z.object({
        score: z.number(),
        correctAnswers: z.number(),
        timeTaken: z.number()
      }).parse(req.body);

      const completedAttempt = await storage.completeTestAttempt(
        attemptId, 
        validateBody.score, 
        validateBody.correctAnswers, 
        validateBody.timeTaken
      );
      
      res.json(completedAttempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  router.get("/user/test-attempts", async (req, res) => {
    const clerkId = req.headers['x-clerk-user-id'] as string;
      
    if (!clerkId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUserByClerkId(clerkId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const attempts = await storage.getTestAttemptsByUser(user.id);
    res.json(attempts);
  });
  
  router.get("/test-attempts/:id", async (req, res) => {
    try {
      const attemptId = parseInt(req.params.id);
      const attempt = await storage.getTestAttempt(attemptId);
      
      if (!attempt) {
        return res.status(404).json({ message: "Test attempt not found" });
      }
      
      res.json(attempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // User Answers Routes
  router.post("/user-answers", async (req, res) => {
    try {
      const userAnswerData = insertUserAnswerSchema.parse(req.body);
      const userAnswer = await storage.saveUserAnswer(userAnswerData);
      res.status(201).json(userAnswer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  router.get("/test-attempts/:id/answers", async (req, res) => {
    const attemptId = parseInt(req.params.id);
    const answers = await storage.getUserAnswers(attemptId);
    res.json(answers);
  });

  // Badges Routes
  router.get("/badges", async (req, res) => {
    const badges = await storage.getBadges();
    res.json(badges);
  });

  router.get("/user/badges", async (req, res) => {
    const clerkId = req.headers['x-clerk-user-id'] as string;
      
    if (!clerkId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUserByClerkId(clerkId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const badges = await storage.getUserBadges(user.id);
    res.json(badges);
  });

  // User Streaks Routes
  router.get("/user/streak", async (req, res) => {
    const clerkId = req.headers['x-clerk-user-id'] as string;
      
    if (!clerkId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUserByClerkId(clerkId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const streak = await storage.getUserStreak(user.id);
    res.json(streak || { userId: user.id, currentStreak: 0, longestStreak: 0 });
  });

  // User Subject Performance Routes
  router.get("/user/subject-performance", async (req, res) => {
    const clerkId = req.headers['x-clerk-user-id'] as string;
      
    if (!clerkId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUserByClerkId(clerkId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const performance = await storage.getUserSubjectPerformance(user.id);
    res.json(performance);
  });

  // Milestones Routes
  router.get("/milestones", async (req, res) => {
    const milestones = await storage.getMilestones();
    res.json(milestones);
  });

  router.get("/user/milestones", async (req, res) => {
    const clerkId = req.headers['x-clerk-user-id'] as string;
      
    if (!clerkId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUserByClerkId(clerkId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const milestones = await storage.getUserMilestones(user.id);
    res.json(milestones);
  });

  // Leaderboard Routes
  router.get("/leaderboard", async (req, res) => {
    const leaderboard = await storage.getLeaderboard();
    res.json(leaderboard);
  });

  // Admin Routes for Test Series Data
  router.post("/admin/seed-subjects", async (req, res) => {
    try {
      const clerkId = req.headers['x-clerk-user-id'] as string;
      // For security, only admins should be able to seed data
      if (!clerkId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { seedDatabase } = await import("./data/seed");
      await seedDatabase();
      
      res.json({ message: "Database seeded successfully with subjects and tests" });
    } catch (error: any) {
      console.error("Error seeding database:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  router.post("/admin/generate-test-questions/:testId", async (req, res) => {
    try {
      const clerkId = req.headers['x-clerk-user-id'] as string;
      // For security, only admins should be able to generate questions
      if (!clerkId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const testId = parseInt(req.params.testId);
      const { generateQuestionsForSingleTest } = await import("./data/generateTestQuestions");
      
      await generateQuestionsForSingleTest(testId);
      res.json({ message: `Questions generated successfully for test ${testId}` });
    } catch (error: any) {
      console.error("Error generating test questions:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  router.post("/admin/generate-subject-questions/:subjectId", async (req, res) => {
    try {
      const clerkId = req.headers['x-clerk-user-id'] as string;
      // For security, only admins should be able to generate questions
      if (!clerkId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const subjectId = parseInt(req.params.subjectId);
      const { generateQuestionsForSubject } = await import("./data/generateTestQuestions");
      
      await generateQuestionsForSubject(subjectId);
      res.json({ message: `Questions generated successfully for subject ${subjectId}` });
    } catch (error: any) {
      console.error("Error generating subject questions:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // AI Routes
  router.post("/ai/generate-question", async (req, res) => {
    try {
      const { subject, difficulty } = req.body;
      
      const validateBody = z.object({
        subject: z.string(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional()
      }).parse(req.body);
      
      const question = await generateQuestion(validateBody.subject, validateBody.difficulty);
      res.json(question);
    } catch (error: any) {
      console.error("Error generating question:", error);
      res.status(500).json({ message: error.message });
    }
  });

  router.post("/ai/generate-questions", async (req, res) => {
    try {
      const validateBody = z.object({
        subject: z.string(),
        count: z.number().int().min(1).max(20),
        difficulty: z.enum(["easy", "medium", "hard"]).optional()
      }).parse(req.body);
      
      const questions = await generateQuestions(
        validateBody.subject, 
        validateBody.count, 
        validateBody.difficulty
      );
      
      res.json(questions);
    } catch (error: any) {
      console.error("Error generating questions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  router.post("/ai/analyze-performance", async (req, res) => {
    try {
      const clerkId = req.headers['x-clerk-user-id'] as string;
      
      if (!clerkId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
  
      const user = await storage.getUserByClerkId(clerkId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const validateBody = z.object({
        testAttemptId: z.number().int().positive()
      }).parse(req.body);
      
      const answersRaw = await storage.getUserAnswers(validateBody.testAttemptId);
      const subjects = await storage.getSubjects();
      
      // Transform user answers data to match the format expected by analyzePerformance
      const answers = answersRaw.map(a => ({
        questionId: a.questionId,
        selectedOption: a.selectedOption || 0,
        isCorrect: a.isCorrect || false,
        question: {
          text: a.question.text,
          subjectId: a.question.subjectId,
          topic: a.question.topics ? String(a.question.topics) : undefined,
          difficulty: a.question.difficulty ? String(a.question.difficulty) : undefined
        }
      }));
      
      const analysis = await analyzePerformance(answers, subjects);
      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing performance:", error);
      res.status(500).json({ message: error.message });
    }
  });

  router.post("/ai/learning-path", async (req, res) => {
    try {
      const clerkId = req.headers['x-clerk-user-id'] as string;
      
      if (!clerkId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
  
      const user = await storage.getUserByClerkId(clerkId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const performance = await storage.getUserSubjectPerformance(user.id);
      
      // Format the performance data for the learning path
      const formattedPerformance = performance.map(perf => ({
        subject: perf.subject.displayName,
        averageScore: perf.averageScore || 0,
        testsCompleted: perf.testsCompleted || 0,
        strengths: ["Consistent practice", "Strong fundamentals"],
        weaknesses: ["Needs more practice", "Review complex topics"]
      }));
      
      const learningPath = await generateLearningPath(formattedPerformance);
      res.json(learningPath);
    } catch (error: any) {
      console.error("Error generating learning path:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Instant Chapter Test Generation - creates a test and generates questions immediately
  // Endpoint for syncing offline test attempts
  router.post("/test-attempts/sync", async (req, res) => {
    try {
      const validateBody = z.object({
        testId: z.number().int().positive(),
        userId: z.number().int().positive().optional(),
        startedAt: z.string().or(z.date()).transform(val => new Date(val)),
        completedAt: z.string().or(z.date()).transform(val => new Date(val)).optional(),
        score: z.number().min(0).max(100).optional(),
        correctAnswers: z.number().int().min(0).optional(),
        totalQuestions: z.number().int().positive(),
        timeTaken: z.number().int().min(0).optional(),
        status: z.string().optional(),
        userAnswers: z.array(z.object({
          questionId: z.number().int().positive(),
          selectedOption: z.number().int().min(0).max(3),
          isCorrect: z.boolean()
        })).optional()
      }).parse(req.body);
      
      // Validate user
      let userId = validateBody.userId;
      
      // If user ID not provided, try to get from clerk ID
      if (!userId) {
        const clerkId = req.headers['x-clerk-user-id'] as string;
        if (clerkId) {
          const user = await storage.getUserByClerkId(clerkId);
          if (user) {
            userId = user.id;
          }
        }
      }
      
      if (!userId) {
        return res.status(401).json({ message: "User identification required" });
      }
      
      // Create the test attempt - we don't need to pass startedAt as it's defaulted in the schema
      const testAttempt = await storage.createTestAttempt({
        testId: validateBody.testId,
        userId: userId,
        totalQuestions: validateBody.totalQuestions
      });
      
      // If the attempt is already completed, update it
      if (validateBody.completedAt && validateBody.score !== undefined && 
          validateBody.correctAnswers !== undefined && validateBody.timeTaken !== undefined) {
        await storage.completeTestAttempt(
          testAttempt.id,
          validateBody.score,
          validateBody.correctAnswers,
          validateBody.timeTaken
        );
      }
      
      // Save user answers if provided
      if (validateBody.userAnswers && validateBody.userAnswers.length > 0) {
        for (const answer of validateBody.userAnswers) {
          await storage.saveUserAnswer({
            testAttemptId: testAttempt.id,
            questionId: answer.questionId,
            selectedOption: answer.selectedOption,
            isCorrect: answer.isCorrect
          });
        }
      }
      
      res.status(201).json({ 
        success: true, 
        message: "Test attempt synced successfully", 
        testAttempt 
      });
    } catch (error: any) {
      console.error("Error syncing test attempt:", error);
      res.status(400).json({ success: false, message: error.message });
    }
  });
  
  router.post("/instant-chapter-test", async (req, res) => {
    try {
      const validateBody = z.object({
        subjectId: z.number().int().positive(),
        chapter: z.string(),
        questionCount: z.number().int().min(5).max(50).default(30),
        duration: z.number().int().min(5).max(180).default(60) // minutes
      }).parse(req.body);
      
      // Get the subject to use its display name in test title and question generation
      const subject = await storage.getSubjectById(validateBody.subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
      
      // Create test title with subject and chapter
      const testTitle = `${subject.displayName}: ${validateBody.chapter}`;
      
      // Create a new test entry
      const [newTest] = await db.insert(testsTable).values({
        title: testTitle,
        subjectId: validateBody.subjectId,
        description: `Instantly generated test for ${validateBody.chapter}`,
        duration: validateBody.duration,
        questionCount: validateBody.questionCount,
        isSpecial: false,
        availableAt: new Date(), // available immediately
        createdAt: new Date()
      }).returning();
      
      // Generate questions for the test using the optimized algorithm
      const generatedQuestions = await generateChapterTestInstantly(
        validateBody.subjectId, 
        subject.displayName,
        validateBody.chapter,
        validateBody.questionCount
      );
      
      // Insert questions and connect them to the test
      for (let i = 0; i < generatedQuestions.length; i++) {
        // Insert the question
        const [insertedQuestion] = await db.insert(questionsTable).values(generatedQuestions[i]).returning();
        
        // Link question to test
        await db.insert(testQuestionsTable).values({
          testId: newTest.id,
          questionId: insertedQuestion.id,
          order: i + 1,
        });
      }
      
      // Return the created test with its ID
      res.status(201).json({
        message: "Instant chapter test created successfully",
        test: newTest
      });
    } catch (error: any) {
      console.error("Error creating instant chapter test:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.use("/api", router);

  const httpServer = createServer(app);
  return httpServer;
}
