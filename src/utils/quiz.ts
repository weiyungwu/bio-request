import type { Question } from '@/types/question'
import { shuffle } from '@/utils/shuffle'

/** spec.txt 5.4: 單次抽取 5 題. */
export const QUIZ_SIZE = 5
/** spec TASK-011: 通過 = 總分 >= 80. */
export const PASS_SCORE = 80

/**
 * A student's answer. One slot for single choice / true-false (the option index);
 * one per left item for matching (right index); one per position for ordering
 * (option index). `null` = not chosen yet.
 */
export type QuizResponse = (number | null)[]

/** Draws `count` distinct questions in random order (ids are unique in a bank). */
export function drawQuestions(
  pool: readonly Question[],
  count: number,
  random: () => number = Math.random,
): Question[] {
  return shuffle(pool, random).slice(0, count)
}

export function emptyResponse(q: Question): QuizResponse {
  switch (q.type) {
    case 'single_choice':
    case 'true_false':
      return [null]
    case 'matching':
      return q.options.left.map(() => null)
    case 'ordering':
      return q.options.map(() => null)
  }
}

/** 未作答不可直接提交: every slot must be filled. */
export function isAnswered(response: QuizResponse): boolean {
  return response.length > 0 && response.every((v) => v !== null)
}

/**
 * Matching and ordering keys are permutations, so a response that uses an item twice can
 * never be right; the page blocks submit and says why (TASK-011 review I1).
 */
export function hasRepeats(response: QuizResponse): boolean {
  const picked = response.filter((v) => v !== null)
  return new Set(picked).size !== picked.length
}

/** All-or-nothing: matching and ordering count only when every slot is right. */
export function isCorrect(q: Question, response: QuizResponse): boolean {
  if (!isAnswered(response)) return false
  if (q.type === 'single_choice' || q.type === 'true_false') return response[0] === q.answer
  return q.answer.length === response.length && q.answer.every((v, i) => response[i] === v)
}

/** 總分 = 正確題數 / 題目總數 × 100, rounded to a whole number. */
export function scoreOf(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0
}

export const isPassing = (score: number) => score >= PASS_SCORE

/** The correct answer as text, for 顯示解答. */
export function correctAnswerText(q: Question): string {
  switch (q.type) {
    case 'single_choice':
    case 'true_false':
      return q.options[q.answer]!
    case 'matching':
      return q.options.left.map((l, i) => `${l} → ${q.options.right[q.answer[i]!]}`).join('；')
    case 'ordering':
      return q.answer.map((i) => q.options[i]).join(' → ')
  }
}

/** The student's answer as text, for the 錯題補強 list. */
export function responseText(q: Question, response: QuizResponse): string {
  const pick = (list: readonly string[], i: number | null | undefined) =>
    i === null || i === undefined ? '（未作答）' : (list[i] ?? '（未作答）')
  switch (q.type) {
    case 'single_choice':
    case 'true_false':
      return pick(q.options, response[0])
    case 'matching':
      return q.options.left.map((l, i) => `${l} → ${pick(q.options.right, response[i])}`).join('；')
    case 'ordering':
      return response.map((i) => pick(q.options, i)).join(' → ')
  }
}
