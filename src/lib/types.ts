

export type Difficulty = "easy" | "medium" | "hard";

export type TestKind = "daily" | "sunday" | "practice";

export type EndReason = "submitted" | "time_up" | "tab_switch" | "offline";

/** A multiple-choice question including its answer key. Never send this shape to the browser before submission. */
export type QuestionWithAnswer = {
  subject: string;
  chapter: string;
  topic: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: Difficulty;
};

/** What the exam UI receives: no answer key, no explanation. */
export type PublicQuestion = {
  id: string;
  position: number;
  subject: string;
  chapter: string;
  topic: string;
  text: string;
  options: string[];
};
