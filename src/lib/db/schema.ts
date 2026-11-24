import { relations, sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ────────────────────────────── Better Auth ────────────────────────────── */

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    // Profile
    school: text("school"),
    city: text("city"),
    state: text("state"),
    // Learning track — what the student is preparing for (see src/lib/catalog/tracks.ts)
    trackKind: text("track_kind", { enum: ["school", "exam"] }),
    board: text("board"),
    grade: integer("grade"),
    stream: text("stream"),
    exam: text("exam"),
    /** Leaderboard / forum cohort derived from the track, e.g. "g10", "g12-science", "exam-jee". */
    cohort: text("cohort"),
    onboarded: boolean("onboarded").notNull().default(false),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    /** When the current track was set (onboarding, correction, promotion or exam switch). */
    trackSetAt: timestamp("track_set_at", { withTimezone: true }),
    lastPromotedAt: timestamp("last_promoted_at", { withTimezone: true }),
    /** Staff access. "admin" has every permission and manages staff; "sub_admin" only has `permissions`. */
    role: text("role", { enum: ["student", "admin", "sub_admin"] })
      .notNull()
      .default("student"),
    /** Permission keys granted to a sub-admin (see src/lib/admin/permissions.ts). Ignored for other roles. */
    permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
    /** Suspended accounts can't sign in and are treated as signed out everywhere. */
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedReason: text("suspended_reason"),
    /** Sessions created before this moment are rejected (suspend, sign out everywhere, password reset) — even while
     *  Better Auth's 5-minute cookie cache would still accept them. */
    sessionsRevokedAt: timestamp("sessions_revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("user_role_created_idx").on(t.role, t.createdAt), index("user_cohort_idx").on(t.cohort)],
);

/** Audit trail of every track change — promotions are one-way and rate limited (src/lib/catalog/rules.ts). */
export const trackEvents = pgTable(
  "track_events",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["onboarded", "corrected", "promoted", "exam_switched"] }).notNull(),
    fromKey: text("from_key"),
    toKey: text("to_key").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("track_events_user_idx").on(t.userId, t.createdAt)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ────────────────────────────── Learning ────────────────────────────── */

export const userStats = pgTable("user_stats", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  xp: integer("xp").notNull().default(0),
  testsCompleted: integer("tests_completed").notNull().default(0),
  questionsAnswered: integer("questions_answered").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  /** IST calendar day (YYYY-MM-DD) of the last completed test. */
  lastActiveDay: text("last_active_day"),
  practiceGenerated: integer("practice_generated").notNull().default(0),
  updatedAt: updatedAt(),
});

export const tests = pgTable(
  "tests",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["daily", "sunday", "practice"] }).notNull(),
    /** Track the test was made for (e.g. "cbse-10", "upmsp-12-pcm", "exam-jee"). */
    trackKey: text("track_key").notNull(),
    /** Subject slug, or "mixed" for the Sunday test. */
    subject: text("subject").notNull(),
    chapter: text("chapter"),
    title: text("title").notNull(),
    /** IST day this daily/sunday test belongs to. */
    dayKey: text("day_key"),
    durationSec: integer("duration_sec").notNull(),
    questionCount: integer("question_count").notNull(),
    difficulty: text("difficulty", { enum: ["easy", "medium", "hard", "adaptive"] })
      .notNull()
      .default("adaptive"),
    source: text("source", { enum: ["ai", "bank", "mixed"] }).notNull(),
    /** Strict tests auto-submit when the student leaves the window. */
    strict: boolean("strict").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    index("tests_user_idx").on(t.userId, t.createdAt),
    uniqueIndex("tests_daily_unique")
      .on(t.userId, t.trackKey, t.kind, t.subject, t.dayKey)
      .where(sql`${t.dayKey} is not null`),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: id(),
    testId: text("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    subject: text("subject").notNull(),
    chapter: text("chapter").notNull(),
    topic: text("topic").notNull(),
    text: text("text").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation").notNull(),
    difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }).notNull(),
    /** Bank question id when this came from the offline bank. */
    bankId: text("bank_id"),
  },
  (t) => [index("questions_test_idx").on(t.testId, t.position)],
);

export type AttemptFeedback = {
  summary: string;
  strengths: string[];
  focusAreas: { topic: string; why: string; tip: string }[];
  nextSteps: string[];
};

export const attempts = pgTable(
  "attempts",
  {
    id: id(),
    testId: text("test_id")
      .notNull()
      .unique()
      .references(() => tests.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["in_progress", "completed"] })
      .notNull()
      .default("in_progress"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    timeTakenSec: integer("time_taken_sec"),
    correct: integer("correct").notNull().default(0),
    wrong: integer("wrong").notNull().default(0),
    skipped: integer("skipped").notNull().default(0),
    total: integer("total").notNull(),
    /** Percentage 0–100. */
    score: integer("score"),
    xpEarned: integer("xp_earned").notNull().default(0),
    endReason: text("end_reason", { enum: ["submitted", "time_up", "tab_switch", "offline"] }),
    newBadges: jsonb("new_badges").$type<string[]>().notNull().default([]),
    feedback: jsonb("feedback").$type<AttemptFeedback>(),
  },
  (t) => [index("attempts_user_completed_idx").on(t.userId, t.completedAt), index("attempts_completed_idx").on(t.completedAt)],
);

export const answers = pgTable(
  "answers",
  {
    id: id(),
    attemptId: text("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    trackKey: text("track_key").notNull(),
    subject: text("subject").notNull(),
    chapter: text("chapter").notNull(),
    topic: text("topic").notNull(),
    selectedIndex: integer("selected_index"),
    isCorrect: boolean("is_correct").notNull(),
    timeSpentSec: integer("time_spent_sec").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("answers_attempt_question_unique").on(t.attemptId, t.questionId),
    index("answers_user_track_subject_idx").on(t.userId, t.trackKey, t.subject),
  ],
);

export const userBadges = pgTable(
  "user_badges",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull(),
    earnedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
);

export type InsightsReport = {
  headline: string;
  overview: string;
  strengths: string[];
  weaknesses: { topic: string; subject: string; advice: string }[];
  recommendations: string[];
};

export type StudyPlanReport = {
  focus: string;
  days: {
    day: string;
    theme: string;
    tasks: { subject: string; activity: string; minutes: number }[];
  }[];
  goals: string[];
};

export const aiReports = pgTable(
  "ai_reports",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["insights", "study_plan"] }).notNull(),
    data: jsonb("data").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("ai_reports_user_kind_idx").on(t.userId, t.kind, t.createdAt)],
);

/* ────────────────────────────── AI tutor ────────────────────────────── */

export const chatThreads = pgTable(
  "chat_threads",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New conversation"),
    /** AI SDK UIMessage[] */
    messages: jsonb("messages").$type<unknown[]>().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("chat_threads_user_idx").on(t.userId, t.updatedAt)],
);

/* ────────────────────────────── Community ────────────────────────────── */

export const forumPosts = pgTable(
  "forum_posts",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Cohort the doubt was asked in (Class 10, Class 12 Science, JEE aspirants…). */
    cohort: text("cohort").notNull(),
    subject: text("subject").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    acceptedReplyId: text("accepted_reply_id"),
    replyCount: integer("reply_count").notNull().default(0),
    voteCount: integer("vote_count").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("forum_posts_cohort_created_idx").on(t.cohort, t.createdAt),
    index("forum_posts_subject_idx").on(t.subject),
    // Badge rules count each student's doubts and answers on every test submit.
    index("forum_posts_user_idx").on(t.userId),
  ],
);

export const forumReplies = pgTable(
  "forum_replies",
  {
    id: id(),
    postId: text("post_id")
      .notNull()
      .references(() => forumPosts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    isAi: boolean("is_ai").notNull().default(false),
    voteCount: integer("vote_count").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("forum_replies_post_idx").on(t.postId, t.createdAt), index("forum_replies_user_idx").on(t.userId)],
);

export const forumVotes = pgTable(
  "forum_votes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetType: text("target_type", { enum: ["post", "reply"] }).notNull(),
    targetId: text("target_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.targetType, t.targetId] })],
);

/* ────────────────────────────── Catalog (managed from /admin) ────────────────────────────── */

/** Boards, streams and competitive exams a student can pick from. */
export const catalogOptions = pgTable(
  "catalog_options",
  {
    kind: text("kind", { enum: ["board", "stream", "exam"] }).notNull(),
    id: text("id").notNull(),
    name: text("name").notNull(),
    short: text("short").notNull(),
    /** Board: full name · stream: subjects summary · exam: one-line description. */
    description: text("description"),
    /** Board only, e.g. "NCERT books". */
    note: text("note"),
    /** Stream only: "science" | "commerce" | "arts" — groups streams into one cohort / leaderboard. */
    groupKey: text("group_key"),
    /** Exam only: students also pick a stream (domain subjects). */
    needsStream: boolean("needs_stream").notNull().default(false),
    sort: integer("sort").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.kind, t.id] })],
);

export const subjects = pgTable("subjects", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  short: text("short").notNull(),
  /** Icon name from src/lib/catalog/icons.ts. */
  icon: text("icon").notNull().default("BookOpenText"),
  /** Colour tone key from src/lib/catalog/icons.ts. */
  tone: text("tone").notNull().default("sky"),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** A chapter list (e.g. "NCERT Class 10 · Mathematics"); shared by every course that teaches it. */
export const syllabi = pgTable(
  "syllabi",
  {
    id: text("id").primaryKey(),
    subjectSlug: text("subject_slug")
      .notNull()
      .references(() => subjects.slug, { onDelete: "restrict" }),
    title: text("title").notNull(),
    note: text("note"),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("syllabi_subject_idx").on(t.subjectSlug)],
);

export const chapters = pgTable(
  "chapters",
  {
    id: id(),
    syllabusId: text("syllabus_id")
      .notNull()
      .references(() => syllabi.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Book part / branch / section — powers the Sunday mixed tests. */
    unit: text("unit").notNull().default("General"),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [
    uniqueIndex("chapters_syllabus_name_unique").on(t.syllabusId, t.name),
    index("chapters_syllabus_sort_idx").on(t.syllabusId, t.sort),
  ],
);

export type WeeklyPart = { subject: string; units?: string[]; count: number };
export type WeeklyConfig = { title: string; label: string; durationSec: number; parts: WeeklyPart[] };

/** A course = what a student prepares for: board × class (× stream), or a competitive exam (× stream). */
export const courses = pgTable(
  "courses",
  {
    key: text("key").primaryKey(),
    kind: text("kind", { enum: ["school", "exam"] }).notNull(),
    board: text("board"),
    grade: integer("grade"),
    stream: text("stream"),
    exam: text("exam"),
    name: text("name").notNull(),
    short: text("short").notNull(),
    /** Students in the same cohort share a leaderboard and doubt forum. */
    cohortKey: text("cohort_key").notNull(),
    cohortLabel: text("cohort_label").notNull(),
    /** Who the AI writes for, e.g. "CBSE (NCERT books) Class 12 Science (PCM) students". */
    audience: text("audience").notNull(),
    dailyQuestions: integer("daily_questions").notNull().default(10),
    dailyDurationSec: integer("daily_duration_sec")
      .notNull()
      .default(15 * 60),
    weekly: jsonb("weekly").$type<WeeklyConfig>().notNull(),
    active: boolean("active").notNull().default(true),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("courses_active_sort_idx").on(t.active, t.sort), index("courses_cohort_idx").on(t.cohortKey)],
);

export const courseSubjects = pgTable(
  "course_subjects",
  {
    id: id(),
    courseKey: text("course_key")
      .notNull()
      .references(() => courses.key, { onDelete: "cascade" }),
    subjectSlug: text("subject_slug")
      .notNull()
      .references(() => subjects.slug, { onDelete: "restrict" }),
    /** Chapter lists this subject follows (usually one; two for exams that span Class 11 + 12). */
    syllabusIds: jsonb("syllabus_ids").$type<string[]>().notNull().default([]),
    /** Extra question pools this subject may draw bank questions from. */
    borrowIds: jsonb("borrow_ids").$type<string[]>().notNull().default([]),
    /** Only use bank questions whose chapter is in the syllabus (languages). */
    strict: boolean("strict").notNull().default(false),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [uniqueIndex("course_subjects_unique").on(t.courseKey, t.subjectSlug)],
);

/** Hand-checked fallback questions, grouped by the chapter list they belong to. */
export const bankQuestions = pgTable(
  "bank_questions",
  {
    id: id(),
    syllabusId: text("syllabus_id")
      .notNull()
      .references(() => syllabi.id, { onDelete: "cascade" }),
    subjectSlug: text("subject_slug")
      .notNull()
      .references(() => subjects.slug, { onDelete: "restrict" }),
    chapter: text("chapter").notNull(),
    topic: text("topic").notNull(),
    text: text("text").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation").notNull(),
    difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] })
      .notNull()
      .default("medium"),
    active: boolean("active").notNull().default(true),
    /** seed = starter bank, admin = typed or imported by staff, ai = written by the AI model, import = taken from an open dataset. */
    source: text("source", { enum: ["seed", "admin", "ai", "import"] })
      .notNull()
      .default("admin"),
    /** Only `approved` questions are ever picked for tests; `pending` ones wait in /admin/review. */
    review: text("review", { enum: ["approved", "pending", "rejected"] })
      .notNull()
      .default("approved"),
    /** Where it came from, e.g. "Gemini · gemini-flash-latest" or "SciQ (CC BY-NC 3.0)". Shown to reviewers. */
    sourceNote: text("source_note"),
    /** A second, independent AI pass that answered the question without seeing the key. */
    aiCheck: jsonb("ai_check").$type<AiAnswerCheck>(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("bank_questions_syllabus_idx").on(t.syllabusId, t.chapter),
    index("bank_questions_subject_idx").on(t.subjectSlug),
    index("bank_questions_review_idx").on(t.review, t.createdAt),
  ],
);

export type AiAnswerCheck = {
  /** Option index the checker chose, or -1 if it thought none were right. */
  picked: number;
  agrees: boolean;
  note?: string;
  model: string;
  at: string;
};

/** Platform settings edited from /admin/settings (promotion rules, sign-ups …). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

/* ────────────────────────────── Admin ────────────────────────────── */

/** Every staff action, kept even if the staff account is later removed (actor name is snapshotted). */
export const adminAudit = pgTable(
  "admin_audit",
  {
    id: id(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type", {
      enum: ["user", "staff", "post", "reply", "announcement", "course", "subject", "syllabus", "chapter", "question", "option", "settings"],
    }).notNull(),
    targetId: text("target_id"),
    /** Human-readable one-liner, e.g. "Suspended Aarav Sharma (aarav@…)". */
    summary: text("summary").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("admin_audit_created_idx").on(t.createdAt), index("admin_audit_actor_idx").on(t.actorId, t.createdAt)],
);

/** Notices shown on student dashboards — to everyone or to one cohort. */
export const announcements = pgTable(
  "announcements",
  {
    id: id(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** "all" or a cohort key such as "g10" / "exam-jee". */
    audience: text("audience").notNull().default("all"),
    tone: text("tone", { enum: ["info", "success", "warning"] })
      .notNull()
      .default("info"),
    active: boolean("active").notNull().default(true),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("announcements_active_idx").on(t.active, t.createdAt)],
);

/* ────────────────────────────── Relations ────────────────────────────── */

export const userRelations = relations(user, ({ one, many }) => ({
  sessions: many(session),
  accounts: many(account),
  stats: one(userStats, { fields: [user.id], references: [userStats.userId] }),
  tests: many(tests),
  badges: many(userBadges),
}));

/** Lets Better Auth load a session and its user in one joined query (`advanced.database.joins`). */
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const testsRelations = relations(tests, ({ one, many }) => ({
  user: one(user, { fields: [tests.userId], references: [user.id] }),
  questions: many(questions),
  attempt: one(attempts, { fields: [tests.id], references: [attempts.testId] }),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  test: one(tests, { fields: [questions.testId], references: [tests.id] }),
}));

export const attemptsRelations = relations(attempts, ({ one, many }) => ({
  test: one(tests, { fields: [attempts.testId], references: [tests.id] }),
  user: one(user, { fields: [attempts.userId], references: [user.id] }),
  answers: many(answers),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  attempt: one(attempts, { fields: [answers.attemptId], references: [attempts.id] }),
  question: one(questions, { fields: [answers.questionId], references: [questions.id] }),
}));

export const syllabiRelations = relations(syllabi, ({ one, many }) => ({
  subject: one(subjects, { fields: [syllabi.subjectSlug], references: [subjects.slug] }),
  chapters: many(chapters),
  questions: many(bankQuestions),
}));

export const chaptersRelations = relations(chapters, ({ one }) => ({
  syllabus: one(syllabi, { fields: [chapters.syllabusId], references: [syllabi.id] }),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  subjects: many(courseSubjects),
}));

export const courseSubjectsRelations = relations(courseSubjects, ({ one }) => ({
  course: one(courses, { fields: [courseSubjects.courseKey], references: [courses.key] }),
  subject: one(subjects, { fields: [courseSubjects.subjectSlug], references: [subjects.slug] }),
}));

export const bankQuestionsRelations = relations(bankQuestions, ({ one }) => ({
  syllabus: one(syllabi, { fields: [bankQuestions.syllabusId], references: [syllabi.id] }),
}));

export const forumPostsRelations = relations(forumPosts, ({ one, many }) => ({
  author: one(user, { fields: [forumPosts.userId], references: [user.id] }),
  replies: many(forumReplies),
}));

export const forumRepliesRelations = relations(forumReplies, ({ one }) => ({
  post: one(forumPosts, { fields: [forumReplies.postId], references: [forumPosts.id] }),
  author: one(user, { fields: [forumReplies.userId], references: [user.id] }),
}));

export type User = typeof user.$inferSelect;
export type Test = typeof tests.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type Answer = typeof answers.$inferSelect;
export type UserStats = typeof userStats.$inferSelect;
export type ForumPost = typeof forumPosts.$inferSelect;
export type ForumReply = typeof forumReplies.$inferSelect;
export type ChatThread = typeof chatThreads.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type AdminAuditEntry = typeof adminAudit.$inferSelect;
export type CourseRow = typeof courses.$inferSelect;
export type SubjectRow = typeof subjects.$inferSelect;
export type SyllabusRow = typeof syllabi.$inferSelect;
export type ChapterRow = typeof chapters.$inferSelect;
export type BankQuestionRow = typeof bankQuestions.$inferSelect;
