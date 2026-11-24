import type { EndReason, TestKind } from "./types";

/* ───────────────────────── Levels ───────────────────────── */

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number) {
  return 150 + 50 * (level - 1);
}

/** Total XP required to reach `level`. */
export function xpForLevel(level: number) {
  const n = level - 1;
  return 150 * n + 25 * n * (n - 1);
}

export function levelInfo(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    title: levelTitle(level),
    current: xp - floor,
    needed: next - floor,
    progress: Math.round(((xp - floor) / (next - floor)) * 100),
    nextLevelXp: next,
  };
}

export function levelTitle(level: number) {
  if (level >= 20) return "Legend";
  if (level >= 15) return "Topper";
  if (level >= 10) return "Achiever";
  if (level >= 6) return "Scholar";
  if (level >= 3) return "Learner";
  return "Beginner";
}

/* ───────────────────────── XP ───────────────────────── */

export function computeXp(args: {
  kind: TestKind;
  correct: number;
  total: number;
  score: number;
  endReason: EndReason;
  streakIncreased: boolean;
  newStreak: number;
}) {
  const { kind, correct, total, score, endReason, streakIncreased, newStreak } = args;
  const perCorrect = kind === "sunday" ? 12 : kind === "daily" ? 10 : 4;
  let xp = correct * perCorrect;
  const fairFinish = endReason !== "tab_switch";
  if (fairFinish) {
    xp += kind === "sunday" ? 40 : kind === "daily" ? 20 : 5;
    if (kind !== "practice" && total >= 5) {
      if (score === 100) xp += 50;
      else if (score >= 90) xp += 30;
    }
  }
  if (streakIncreased) xp += Math.min(newStreak, 7) * 5;
  return xp;
}

/* ───────────────────────── Streaks ───────────────────────── */

export function nextStreak(lastActiveDay: string | null, today: string, yesterday: string, current: number) {
  if (lastActiveDay === today) return { streak: current, increased: false };
  if (lastActiveDay === yesterday) return { streak: current + 1, increased: true };
  return { streak: 1, increased: true };
}

/* ───────────────────────── Badges ───────────────────────── */

export type BadgeTier = "bronze" | "silver" | "gold";

export type BadgeContext = {
  testsCompleted: number;
  currentStreak: number;
  xp: number;
  practiceGenerated: number;
  forumPosts: number;
  forumReplies: number;
  acceptedAnswers: number;
  /** Distinct subjects of the current track with an 80%+ daily test. */
  aceSubjects: number;
  /** Number of subjects in the current track. */
  trackSubjectCount: number;
  /** Times the student has moved up a class / into a competitive exam. */
  promotions: number;
  attempt?: { kind: TestKind; subject: string; score: number; total: number; endReason: EndReason };
};

export type BadgeDef = {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  icon:
    | "footprints"
    | "flame"
    | "target"
    | "crown"
    | "sun"
    | "compass"
    | "message"
    | "hand"
    | "graduation"
    | "zap"
    | "star"
    | "book"
    | "rocket";
  /** Progress towards the badge: [current, goal]. */
  progress: (c: BadgeContext) => [number, number];
  earned: (c: BadgeContext) => boolean;
};

const count = (key: keyof BadgeContext, goal: number) => ({
  progress: (c: BadgeContext) => [Math.min(Number(c[key] ?? 0), goal), goal] as [number, number],
  earned: (c: BadgeContext) => Number(c[key] ?? 0) >= goal,
});

export const BADGES: BadgeDef[] = [
  { id: "first-step", name: "First Step", description: "Complete your first test.", tier: "bronze", icon: "footprints", ...count("testsCompleted", 1) },
  { id: "steady-10", name: "Steady Learner", description: "Complete 10 tests.", tier: "silver", icon: "book", ...count("testsCompleted", 10) },
  { id: "half-century", name: "Half Century", description: "Complete 50 tests.", tier: "gold", icon: "graduation", ...count("testsCompleted", 50) },
  { id: "streak-3", name: "On a Roll", description: "Keep a 3-day streak.", tier: "bronze", icon: "flame", ...count("currentStreak", 3) },
  { id: "streak-7", name: "Week Warrior", description: "Keep a 7-day streak.", tier: "silver", icon: "flame", ...count("currentStreak", 7) },
  { id: "streak-30", name: "Unstoppable", description: "Keep a 30-day streak.", tier: "gold", icon: "flame", ...count("currentStreak", 30) },
  {
    id: "perfect",
    name: "Perfectionist",
    description: "Score 100% on a daily or Sunday test.",
    tier: "gold",
    icon: "target",
    progress: () => [0, 1],
    earned: (c) => !!c.attempt && c.attempt.kind !== "practice" && c.attempt.total >= 5 && c.attempt.score === 100 && c.attempt.endReason !== "tab_switch",
  },
  {
    id: "sunday-champ",
    name: "Sunday Champion",
    description: "Finish a Sunday super test or mock.",
    tier: "silver",
    icon: "sun",
    progress: () => [0, 1],
    earned: (c) => !!c.attempt && c.attempt.kind === "sunday" && c.attempt.endReason !== "tab_switch",
  },
  { id: "sharp-shooter", name: "Sharp Shooter", description: "Score 80% or more in a daily test.", tier: "bronze", icon: "star", ...count("aceSubjects", 1) },
  { id: "subject-master", name: "Subject Master", description: "Score 80%+ in daily tests of 3 different subjects.", tier: "silver", icon: "star", ...count("aceSubjects", 3) },
  {
    id: "all-rounder",
    name: "All-Rounder",
    description: "Score 80%+ in a daily test of every subject in your course.",
    tier: "gold",
    icon: "crown",
    progress: (c) => [Math.min(c.aceSubjects, c.trackSubjectCount), Math.max(c.trackSubjectCount, 1)],
    earned: (c) => c.trackSubjectCount > 0 && c.aceSubjects >= c.trackSubjectCount,
  },
  { id: "moving-up", name: "Moving Up", description: "Move up to your next class or exam.", tier: "silver", icon: "rocket", ...count("promotions", 1) },
  { id: "explorer", name: "Explorer", description: "Generate 5 AI practice tests.", tier: "bronze", icon: "compass", ...count("practiceGenerated", 5) },
  { id: "curious", name: "Curious Mind", description: "Ask your first doubt in the community.", tier: "bronze", icon: "message", ...count("forumPosts", 1) },
  { id: "helper", name: "Helping Hand", description: "Answer 5 doubts asked by other students.", tier: "silver", icon: "hand", ...count("forumReplies", 5) },
  { id: "mentor", name: "Mentor", description: "Get 3 answers accepted by other students.", tier: "gold", icon: "graduation", ...count("acceptedAnswers", 3) },
  { id: "xp-1000", name: "Rising Star", description: "Earn 1,000 XP.", tier: "silver", icon: "zap", ...count("xp", 1000) },
  { id: "xp-5000", name: "Powerhouse", description: "Earn 5,000 XP.", tier: "gold", icon: "crown", ...count("xp", 5000) },
];

export const BADGE_MAP = Object.fromEntries(BADGES.map((b) => [b.id, b])) as Record<string, BadgeDef>;

export function newlyEarnedBadges(ctx: BadgeContext, owned: Set<string>) {
  return BADGES.filter((b) => !owned.has(b.id) && b.earned(ctx)).map((b) => b.id);
}

export const TIER_STYLES: Record<BadgeTier, { label: string; tile: string; ring: string; text: string }> = {
  bronze: {
    label: "Bronze",
    tile: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
    ring: "ring-orange-500/25",
    text: "text-orange-700 dark:text-orange-300",
  },
  silver: {
    label: "Silver",
    tile: "bg-slate-500/12 text-slate-700 dark:text-slate-200",
    ring: "ring-slate-400/35",
    text: "text-slate-600 dark:text-slate-300",
  },
  gold: {
    label: "Gold",
    tile: "bg-amber-400/15 text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/35",
    text: "text-amber-700 dark:text-amber-300",
  },
};
