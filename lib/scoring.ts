export const POINTS = {
  MAJORITY_VOTE: 50,
  MINORITY_VOTE: 150,
  SPEED_BONUS: 50,
  CREATIVE_WIN: 500,
  TRIVIA_MAX: 1000,
  TRIVIA_MIN: 100,
} as const;

export const STREAK_MULTIPLIERS = {
  3: 1.5,
  5: 2.0,
} as const;

export function calculateSpeedBonus(
  answerTimeMs: number,
  timerDurationMs: number
): number {
  return answerTimeMs < timerDurationMs / 2 ? POINTS.SPEED_BONUS : 0;
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 5) return STREAK_MULTIPLIERS[5];
  if (streak >= 3) return STREAK_MULTIPLIERS[3];
  return 1;
}

export function calculateTriviaPoints(
  answerTimeMs: number,
  timerDurationMs: number
): number {
  const ratio = 1 - answerTimeMs / timerDurationMs;
  return Math.round(
    POINTS.TRIVIA_MIN + ratio * (POINTS.TRIVIA_MAX - POINTS.TRIVIA_MIN)
  );
}

export function calculateWouldYouRatherPoints(
  isMajority: boolean,
  answerTimeMs: number,
  timerDurationMs: number,
  streak: number
): number {
  const base = isMajority ? POINTS.MAJORITY_VOTE : POINTS.MINORITY_VOTE;
  const speed = calculateSpeedBonus(answerTimeMs, timerDurationMs);
  const multiplier = getStreakMultiplier(streak);
  return Math.round((base + speed) * multiplier);
}
