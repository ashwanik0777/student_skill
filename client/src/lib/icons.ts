// Define icons for different entities
export const subjectIcons = {
  mathematics: "calculate",
  physics: "science",
  chemistry: "biotech",
  biology: "psychiatry",
  english: "menu_book",
  social: "public"
};

export const achievementIcons = {
  perfect_score: "emoji_events",
  subject_master: "military_tech",
  streak: "local_fire_department",
  completion: "check_circle",
  improvement: "trending_up"
};

export const analyticIcons = {
  strength: "trending_up",
  weakness: "trending_down",
  recommendation: "psychology"
};

export const testResultIcons = {
  correct: "check_circle",
  incorrect: "cancel",
  time: "schedule",
  rank: "leaderboard"
};

export function getSubjectIcon(subjectName: string): string {
  return subjectIcons[subjectName] || "school";
}

export function getAchievementIcon(type: string): string {
  return achievementIcons[type] || "emoji_events";
}

export function getAnalyticIcon(type: string): string {
  return analyticIcons[type] || "insights";
}

export function getTestResultIcon(type: string): string {
  return testResultIcons[type] || "help_outline";
}
