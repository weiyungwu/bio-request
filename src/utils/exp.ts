/**
 * Quiz EXP rules, docs/progression.md §2 (wired with TASK-011/012). The daily cap and
 * other first-completion rewards are TASK-015.
 */

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
  quiz: number
  firstClear: number
  total: number
}
