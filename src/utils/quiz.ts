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

/** At least `min` questions of a draw come from `topics`. */
export interface TopicQuota {
  topics: readonly string[]
  min: number
}

/**
 * Per-stage quotas. Stage 1 (Human decision, 2026-11-11): unit A now has most of the bank,
 * so a plain random draw could leave out cells, the stage's main content; at least 2 of
 * the 5 come from units B and C.
 */
export const QUIZ_TOPIC_QUOTAS: Readonly<Record<string, TopicQuota>> = {
  'bio-01': { topics: ['細胞構造', '細胞器功能', '動植物細胞差異'], min: 2 },
}

/**
 * Draws `count` distinct questions in random order (ids are unique in a bank). With a
 * quota, its `min` questions are drawn first from its topics (as many as the bank has),
 * the rest from everything left.
 */
export function drawQuestions(
  pool: readonly Question[],
  count: number,
  random: () => number = Math.random,
  quota?: TopicQuota,
): Question[] {
  const shuffled = shuffle(pool, random)
  if (!quota) return shuffled.slice(0, count)
  const required = shuffled
    .filter((q) => quota.topics.includes(q.topic))
    .slice(0, Math.min(quota.min, count))
  const rest = shuffled.filter((q) => !required.includes(q)).slice(0, count - required.length)
  // Mixed again, so the required questions aren't always first.
  return shuffle([...required, ...rest], random)
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

/** Why the answer can't be submitted yet, or '' when it can (shown next to 提交答案). */
export function submitBlocker(response: QuizResponse): string {
  const blanks = response.filter((v) => v === null).length
  if (blanks > 0) return response.length === 1 ? '請先選擇一個答案' : `還有 ${blanks} 個空格沒有選`
  return hasRepeats(response) ? '有重複的選項，每個選項只能用一次' : ''
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
