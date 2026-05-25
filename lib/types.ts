export type RoomStatus =
  | "lobby"
  | "generating"
  | "playing"
  | "reveal"
  | "ended";
export type GameMode =
  | "would_you_rather"
  | "hot_takes"
  | "most_likely_to"
  | "never_have_i_ever"
  | "classic_trivia"
  | "true_or_false_blitz"
  | "red_flag_green_flag"
  | "truth_or_dare"
  | "confess_or_dare"
  | "compatibility_test"
  | "love_language_quiz"
  | "how_well_do_you_know_me"
  | "rank_it"
  | "closest_wins"
  | "poll_spy"
  | "quiplash"
  | "bad_advice"
  | "two_truths_one_lie"
  | "first_impressions"
  | "assumptions"
  | "fantasy_scenarios"
  | "spicy_never_have_i_ever"
  | "common_ground"
  | "fibbage";
export type GameCategory =
  | "party"
  | "trivia"
  | "creative"
  | "icebreaker"
  | "couples_wholesome"
  | "couples_spicy";
export type QuestionMood =
  | "spicy"
  | "wholesome"
  | "absurd"
  | "existential"
  | "chaotic";
export type QuestionLayout = "dramatic" | "playful" | "minimal" | "bold";

export interface QuestionTheme {
  gradientFrom: string;
  gradientTo: string;
  mood: QuestionMood;
  layout: QuestionLayout;
  accentColor: string;
}

export interface QuestionOption {
  label: string;
  emoji: string;
  sublabel: string;
}

// ── Would You Rather ────────────────────────────────────────────────────────
export interface WouldYouRatherQuestion {
  id: string;
  optionA: QuestionOption;
  optionB: QuestionOption;
  theme: QuestionTheme;
  intensity: number;
}

// ── Hot Takes ────────────────────────────────────────────────────────────────
export interface HotTakesQuestion {
  id: string;
  topic: string;
  statement: string;
  emoji: string;
  agreeLabel: string;
  disagreeLabel: string;
  theme: QuestionTheme;
  intensity: number;
}

// ── Most Likely To ───────────────────────────────────────────────────────────
export interface MostLikelyToQuestion {
  id: string;
  scenario: string;
  emoji: string;
  theme: QuestionTheme;
  intensity: number;
}

// ── Never Have I Ever ────────────────────────────────────────────────────────
export interface NeverHaveIEverQuestion {
  id: string;
  statement: string;
  emoji: string;
  consequence: string;
  theme: QuestionTheme;
  intensity: number;
}

// ── Classic Trivia ───────────────────────────────────────────────────────────
export interface TriviaQuestion {
  id: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: "A" | "B" | "C" | "D";
  category: string;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
  theme: QuestionTheme;
}

// ── True or False Blitz ──────────────────────────────────────────────────────
export interface TrueOrFalseQuestion {
  id: string;
  statement: string;
  answer: "true" | "false";
  category: string;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
  emoji: string;
  theme: QuestionTheme;
}

// ── Red Flag or Green Flag ───────────────────────────────────────────────────
export interface RedFlagGreenFlagQuestion {
  id: string;
  scenario: string;
  emoji: string;
  context: string;
  theme: QuestionTheme;
  intensity: number;
}

// ── Truth or Dare / Confess or Dare ──────────────────────────────────────────
export interface TruthOrDareQuestion {
  id: string;
  truth: string;
  dare: string;
  emoji: string;
  intensity: number;
  theme: QuestionTheme;
}

// ── Compatibility / Love Language / How Well Do You Know Me ─────────────────
export interface CompatibilityQuestion {
  id: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  emoji: string;
  category: string;
  theme: QuestionTheme;
}

// ── Rank It ──────────────────────────────────────────────────────────────────
export interface RankItQuestion {
  id: string;
  prompt: string;
  items: string[];
  correctOrder: number[];
  explanation: string;
  theme: QuestionTheme;
}

// ── Closest Wins ─────────────────────────────────────────────────────────────
export interface ClosestWinsQuestion {
  id: string;
  question: string;
  answer: number;
  unit: string;
  hint?: string;
  minGuess: number;
  maxGuess: number;
  theme: QuestionTheme;
}

// ── Poll Spy ─────────────────────────────────────────────────────────────────
export interface PollSpyQuestion {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  emoji: string;
  theme: QuestionTheme;
}

// ── Quiplash / Bad Advice ────────────────────────────────────────────────────
export interface QuiplashQuestion {
  id: string;
  prompt: string;
  options: { A: string; B: string; C: string; D: string };
  emoji: string;
  theme: QuestionTheme;
}

// ── Two Truths One Lie ───────────────────────────────────────────────────────
export interface TwoTruthsOneLieQuestion {
  id: string;
  topic: string;
  statements: [string, string, string];
  lieIndex: 0 | 1 | 2;
  explanation: string;
  theme: QuestionTheme;
}

export type AnyQuestion =
  | WouldYouRatherQuestion
  | HotTakesQuestion
  | MostLikelyToQuestion
  | NeverHaveIEverQuestion
  | TriviaQuestion
  | TrueOrFalseQuestion
  | RedFlagGreenFlagQuestion
  | TruthOrDareQuestion
  | CompatibilityQuestion
  | RankItQuestion
  | ClosestWinsQuestion
  | PollSpyQuestion
  | QuiplashQuestion
  | TwoTruthsOneLieQuestion;
