/** EXP rules, docs/progression.md §2–§3 (quiz rewards TASK-012; the rest TASK-015). */

/** 首次通關關卡: once per stage. */
export const FIRST_CLEAR_EXP = 30

/** 測驗 60～79 → 10, 80～89 → 20, 90～99 → 30, 100 → 40; below 60 nothing (§3 門檻). */
export function quizScoreExp(score: number): number {
  if (score >= 100) return 40
  if (score >= 90) return 30
  if (score >= 80) return 20
  if (score >= 60) return 10
  return 0
}

/** EXP earned by one finished quiz, itemised for the result page. */
export interface QuizExpAward {
  /** Paid after the daily cap. */
  quiz: number
  /** True when the daily cap cut the quiz reward. */
  capped: boolean
  firstClear: number
  total: number
  /** Badge ids first earned by this quiz. */
  newBadges: string[]
}

/** docs/progression.md §3: quiz-score EXP per local day. First-time rewards are not capped. */
export const DAILY_QUIZ_EXP_CAP = 100
/** §2 first-time rewards. */
export const UNIT_EXP = 10
export const GAME_EXP = 15
export const REVIEW_EXP = 10
