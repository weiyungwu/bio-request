import type { LearningEvent } from '@/types/learningEvent'
import type { KnowledgeMastery, MasteryLevel } from '@/types/mastery'
import { localDay } from '@/utils/achievements'

/**
 * v1.1 §4.4 initial mastery rules, in one place (spec: not scattered in components). The
 * spec calls them provisional, to be calibrated with teaching design before launch.
 */
export type MasteryRules = Readonly<{
  practicingFrom: number
  masteredFrom: number
  recentWindow: number
  recentAccuracy: number
  minDays: number
  minQuestions: number
  recentMinQuestions: number
}>

export const MASTERY_RULES: MasteryRules = Object.freeze({
  /** practicing from this many answers; fewer is learning. */
  practicingFrom: 3,
  /** mastered needs at least this many answers… */
  masteredFrom: 5,
  /** …and at least this share right among the latest `recentWindow` answers… */
  recentWindow: 5,
  recentAccuracy: 0.8,
  /**
   * …on at least this many different local days. Spec: "至少跨 2 次不同學習時段"; a session
   * here is one page load, which a reload restarts, so days show spacing and sessions don't.
   * Human-confirmed (2026-11-10).
   */
  minDays: 2,
  /** …to at least this many different questions ("只靠重複回答同一道題不能達成 mastered")… */
  minQuestions: 5,
  /**
   * …and the right answers among the latest `recentWindow` cover at least this many
   * different questions: otherwise old (even wrong) answers supply the variety while the
   * recent rights are one question repeated. Not in the spec; Human-confirmed (2026-11-10).
   */
  recentMinQuestions: 3,
})

export interface MasteryOptions {
  playerId: string
  /** updatedAt of the result. */
  now: Date
  rules?: MasteryRules
}

/** Answer events about one knowledge point from one player, oldest first. */
function answersAbout(events: readonly LearningEvent[], knowledgeId: string, playerId: string) {
  return events
    .filter(
      (e) =>
        e.eventType === 'question_answered' &&
        typeof e.isCorrect === 'boolean' &&
        // Without a question id an answer can't count towards "different questions".
        e.questionId !== undefined &&
        e.playerId === playerId &&
        e.knowledgeIds.includes(knowledgeId),
    )
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))
}

function levelOf(answers: readonly LearningEvent[], rules: MasteryRules): MasteryLevel {
  if (answers.length === 0) return 'not_started'
  if (answers.length < rules.practicingFrom) return 'learning'
  const recent = answers.slice(-rules.recentWindow)
  const recentCorrect = recent.filter((e) => e.isCorrect)
  const recentRight = recentCorrect.length / recent.length
  const recentQuestions = new Set(recentCorrect.map((e) => e.questionId)).size
  const days = new Set(answers.map((e) => localDay(new Date(e.occurredAt)))).size
  const questions = new Set(answers.map((e) => e.questionId)).size
  const mastered =
    answers.length >= rules.masteredFrom &&
    recentRight >= rules.recentAccuracy &&
    days >= rules.minDays &&
    questions >= rules.minQuestions &&
    recentQuestions >= rules.recentMinQuestions
  return mastered ? 'mastered' : 'practicing'
}

/** One knowledge point's mastery for one player, from that player's answer events. */
export function knowledgeMastery(
  events: readonly LearningEvent[],
  knowledgeId: string,
  { playerId, now, rules = MASTERY_RULES }: MasteryOptions,
): KnowledgeMastery {
  const answers = answersAbout(events, knowledgeId, playerId)
  const correct = answers.filter((e) => e.isCorrect)
  const result: KnowledgeMastery = {
    playerId,
    knowledgeId,
    totalAttempts: answers.length,
    correctAttempts: correct.length,
    wrongAttempts: answers.length - correct.length,
    accuracy: answers.length ? correct.length / answers.length : 0,
    masteryLevel: levelOf(answers, rules),
    updatedAt: now.toISOString(),
  }
  if (answers.length) result.lastAttemptAt = answers[answers.length - 1]!.occurredAt
  if (correct.length) result.lastCorrectAt = correct[correct.length - 1]!.occurredAt
  return result
}

/** Every listed knowledge point, in the order given (not_started ones included). */
export function masteryByPoint(
  events: readonly LearningEvent[],
  knowledgeIds: readonly string[],
  options: MasteryOptions,
): KnowledgeMastery[] {
  return knowledgeIds.map((k) => knowledgeMastery(events, k, options))
}
