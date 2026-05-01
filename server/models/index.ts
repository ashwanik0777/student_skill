import mongoose, { Schema, Document } from 'mongoose';
import {
  User,
  Subject,
  Question,
  Test,
  TestQuestion,
  TestAttempt,
  UserAnswer,
  Badge,
  UserBadge,
  UserStreak,
  UserSubjectPerformance,
  Milestone,
  UserMilestone
} from '../../shared/schema';

// Create proper type for MongoDB documents without ID conflict
// Omit the 'id' field from the original type and rely on MongoDB's '_id'
type WithoutId<T> = Omit<T, 'id'>;

// User Model
interface UserDocument extends WithoutId<User>, Document {
  numericId: number; // Store the original numeric ID
}

const userSchema = new Schema<UserDocument>({
  numericId: { type: Number, required: true, unique: true }, // Store original ID
  clerkId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  school: { type: String, default: null },
  grade: { type: String, default: null },
  avatar: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

export const UserModel = mongoose.model<UserDocument>('User', userSchema);

// Subject Model
interface SubjectDocument extends Subject, Document {}

const subjectSchema = new Schema<SubjectDocument>({
  name: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true }
});

export const SubjectModel = mongoose.model<SubjectDocument>('Subject', subjectSchema);

// Question Model
interface QuestionDocument extends Question, Document {}

const questionSchema = new Schema<QuestionDocument>({
  text: { type: String, required: true },
  subjectId: { type: Number, required: true },
  topic: { type: String },
  difficulty: { type: String },
  options: { type: [String], required: true },
  correctOption: { type: Number, required: true },
  explanation: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const QuestionModel = mongoose.model<QuestionDocument>('Question', questionSchema);

// Test Model
interface TestDocument extends Test, Document {}

const testSchema = new Schema<TestDocument>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  subjectId: { type: Number, required: true },
  timeLimit: { type: Number, required: true },
  isSpecial: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const TestModel = mongoose.model<TestDocument>('Test', testSchema);

// TestQuestion Model
interface TestQuestionDocument extends TestQuestion, Document {}

const testQuestionSchema = new Schema<TestQuestionDocument>({
  testId: { type: Number, required: true },
  questionId: { type: Number, required: true },
  order: { type: Number, required: true }
});

export const TestQuestionModel = mongoose.model<TestQuestionDocument>('TestQuestion', testQuestionSchema);

// TestAttempt Model
interface TestAttemptDocument extends TestAttempt, Document {}

const testAttemptSchema = new Schema<TestAttemptDocument>({
  userId: { type: Number, required: true },
  testId: { type: Number, required: true },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  score: { type: Number },
  correctAnswers: { type: Number },
  timeTaken: { type: Number }
});

export const TestAttemptModel = mongoose.model<TestAttemptDocument>('TestAttempt', testAttemptSchema);

// UserAnswer Model
interface UserAnswerDocument extends UserAnswer, Document {}

const userAnswerSchema = new Schema<UserAnswerDocument>({
  testAttemptId: { type: Number, required: true },
  questionId: { type: Number, required: true },
  selectedOption: { type: Number, required: true },
  isCorrect: { type: Boolean, required: true }
});

export const UserAnswerModel = mongoose.model<UserAnswerDocument>('UserAnswer', userAnswerSchema);

// Badge Model
interface BadgeDocument extends Badge, Document {}

const badgeSchema = new Schema<BadgeDocument>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, required: true },
  icon: { type: String, required: true }
});

export const BadgeModel = mongoose.model<BadgeDocument>('Badge', badgeSchema);

// UserBadge Model
interface UserBadgeDocument extends UserBadge, Document {}

const userBadgeSchema = new Schema<UserBadgeDocument>({
  userId: { type: Number, required: true },
  badgeId: { type: Number, required: true },
  earnedAt: { type: Date, default: Date.now }
});

export const UserBadgeModel = mongoose.model<UserBadgeDocument>('UserBadge', userBadgeSchema);

// UserStreak Model
interface UserStreakDocument extends UserStreak, Document {}

const userStreakSchema = new Schema<UserStreakDocument>({
  userId: { type: Number, required: true },
  currentStreak: { type: Number, required: true, default: 0 },
  longestStreak: { type: Number, required: true, default: 0 },
  lastActivityDate: { type: Date }
});

export const UserStreakModel = mongoose.model<UserStreakDocument>('UserStreak', userStreakSchema);

// UserSubjectPerformance Model
interface UserSubjectPerformanceDocument extends UserSubjectPerformance, Document {}

const userSubjectPerformanceSchema = new Schema<UserSubjectPerformanceDocument>({
  userId: { type: Number, required: true },
  subjectId: { type: Number, required: true },
  testsCompleted: { type: Number, required: true, default: 0 },
  questionsAnswered: { type: Number, required: true, default: 0 },
  questionsCorrect: { type: Number, required: true, default: 0 },
  averageScore: { type: Number, required: true, default: 0 },
  lastImprovement: { type: Date }
});

export const UserSubjectPerformanceModel = mongoose.model<UserSubjectPerformanceDocument>('UserSubjectPerformance', userSubjectPerformanceSchema);

// Milestone Model
interface MilestoneDocument extends Milestone, Document {}

const milestoneSchema = new Schema<MilestoneDocument>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, required: true },
  threshold: { type: Number, required: true },
  icon: { type: String, required: true }
});

export const MilestoneModel = mongoose.model<MilestoneDocument>('Milestone', milestoneSchema);

// UserMilestone Model
interface UserMilestoneDocument extends UserMilestone, Document {}

const userMilestoneSchema = new Schema<UserMilestoneDocument>({
  userId: { type: Number, required: true },
  milestoneId: { type: Number, required: true },
  achievedAt: { type: Date, default: Date.now },
  progress: { type: Number, required: true, default: 0 }
});

export const UserMilestoneModel = mongoose.model<UserMilestoneDocument>('UserMilestone', userMilestoneSchema);