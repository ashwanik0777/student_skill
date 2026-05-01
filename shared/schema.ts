import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  school: text("school"),
  grade: text("grade").default("10"),
  avatar: text("avatar"),
  role: text("role").notNull().default("student"),
  createdAt: timestamp("created_at").defaultNow(),
  clerkId: text("clerk_id"),
  profilePicture: text("profile_picture"),
});

// Subject schema
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
});

// Question schema
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull(),
  text: text("text").notNull(),
  options: json("options").notNull(), // Array of options
  correctOption: integer("correct_option").notNull(), // Index of the correct option
  explanation: text("explanation").notNull(),
  difficulty: integer("difficulty").notNull(), // 1-5 scale
  topics: json("topics").notNull(), // Array of topic strings
  createdAt: timestamp("created_at").defaultNow(),
});

// Test schema
export const tests = pgTable("tests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  subjectId: integer("subject_id").notNull(),
  duration: integer("duration").notNull(), // In minutes
  questionCount: integer("question_count").notNull(),
  isSpecial: boolean("is_special").default(false), // For Sunday special PCMB test
  availableAt: timestamp("available_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Test questions junction table
export const testQuestions = pgTable("test_questions", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull(),
  questionId: integer("question_id").notNull(),
  order: integer("order").notNull(),
});

// User test attempts
export const testAttempts = pgTable("test_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  testId: integer("test_id").notNull(), 
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers"),
  timeTaken: integer("time_taken"), // In seconds
});

// User answers for test attempts
export const userAnswers = pgTable("user_answers", {
  id: serial("id").primaryKey(),
  testAttemptId: integer("test_attempt_id").notNull(),
  questionId: integer("question_id").notNull(),
  selectedOption: integer("selected_option"),
  isCorrect: boolean("is_correct"),
  timeSpent: integer("time_spent"), // In seconds
});

// Badges/achievements
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  type: text("type").notNull(), // e.g., "streak", "score", "completion"
  threshold: integer("threshold").notNull(), // Value needed to earn badge
  subjectId: integer("subject_id"), // Optional, for subject-specific badges
});

// User badges
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  badgeId: integer("badge_id").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
});

// User streaks
export const userStreaks = pgTable("user_streaks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivityDate: timestamp("last_activity_date"),
});

// User subject performance
export const userSubjectPerformance = pgTable("user_subject_performance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: integer("subject_id").notNull(),
  testsCompleted: integer("tests_completed").default(0),
  averageScore: integer("average_score").default(0), // 0-100
  totalTimeSpent: integer("total_time_spent").default(0), // In seconds
  lastTestDate: timestamp("last_test_date"),
});

// Milestones
export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // e.g., "tests_completed", "perfect_score"
  threshold: integer("threshold").notNull(),
  subjectId: integer("subject_id"), // Optional, for subject-specific milestones
  icon: text("icon").notNull(),
});

// User milestones
export const userMilestones = pgTable("user_milestones", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  milestoneId: integer("milestone_id").notNull(),
  achievedAt: timestamp("achieved_at").defaultNow(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertSubjectSchema = createInsertSchema(subjects).omit({ id: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true });
export const insertTestSchema = createInsertSchema(tests).omit({ id: true });
export const insertTestQuestionSchema = createInsertSchema(testQuestions).omit({ id: true });
export const insertTestAttemptSchema = createInsertSchema(testAttempts).omit({ id: true, startedAt: true });
export const insertUserAnswerSchema = createInsertSchema(userAnswers).omit({ id: true });
export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true });
export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({ id: true, earnedAt: true });
export const insertUserStreakSchema = createInsertSchema(userStreaks).omit({ id: true });
export const insertUserSubjectPerformanceSchema = createInsertSchema(userSubjectPerformance).omit({ id: true });
export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true });
export const insertUserMilestoneSchema = createInsertSchema(userMilestones).omit({ id: true, achievedAt: true });

// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type Test = typeof tests.$inferSelect;
export type InsertTest = z.infer<typeof insertTestSchema>;

export type TestQuestion = typeof testQuestions.$inferSelect;
export type InsertTestQuestion = z.infer<typeof insertTestQuestionSchema>;

export type TestAttempt = typeof testAttempts.$inferSelect;
export type InsertTestAttempt = z.infer<typeof insertTestAttemptSchema>;

export type UserAnswer = typeof userAnswers.$inferSelect;
export type InsertUserAnswer = z.infer<typeof insertUserAnswerSchema>;

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;

export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;

export type UserStreak = typeof userStreaks.$inferSelect;
export type InsertUserStreak = z.infer<typeof insertUserStreakSchema>;

export type UserSubjectPerformance = typeof userSubjectPerformance.$inferSelect;
export type InsertUserSubjectPerformance = z.infer<typeof insertUserSubjectPerformanceSchema>;

export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;

export type UserMilestone = typeof userMilestones.$inferSelect;
export type InsertUserMilestone = z.infer<typeof insertUserMilestoneSchema>;
