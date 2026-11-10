import { describe, it, expect } from 'vitest'
import type { LearningEvent } from '@/types/learningEvent'
import { MASTERY_RULES, knowledgeMastery, masteryByPoint } from '@/utils/mastery'

// v1.1 §4.4 initial mastery rules, worked out from answer events (never stored).
const K = 'b-nucleus'
const PLAYER = 'p1'
const now = new Date('2026-11-12T12:00:00Z')
let n = 0

/** One answer to `question` on `day` (2026-11-dd, local noon so the day is unambiguous). */
function answer(
  question: string,
  correct: boolean,
  day = 10,
  extra: Partial<LearningEvent> = {},
): LearningEvent {
  const at = new Date(2026, 10, day, 12, 0, n++).toISOString()
  return {
    id: `e${n}`,
    playerId: PLAYER,
    sessionId: `s${day}`,
    eventType: 'question_answered',
    knowledgeIds: [K],
    questionId: question,
    isCorrect: correct,
    activityId: 'review',
    source: '2d',
    occurredAt: at,
    recordedAt: at,
    ...extra,
  }
}
/** Five different questions, answered on the given days, right or wrong per `results`. */
const fiveQuestions = (results: boolean[], days: number[]) =>
  results.map((r, i) => answer(`q${i + 1}`, r, days[i]))

const level = (events: LearningEvent[]) =>
  knowledgeMastery(events, K, { playerId: PLAYER, now }).masteryLevel

describe('knowledgeMastery', () => {
  it('is not_started with no answers, with zero counts', () => {
    expect(knowledgeMastery([], K, { playerId: PLAYER, now })).toEqual({
      playerId: PLAYER,
      knowledgeId: K,
      totalAttempts: 0,
      correctAttempts: 0,
      wrongAttempts: 0,
      accuracy: 0,
      masteryLevel: 'not_started',
      updatedAt: now.toISOString(),
    })
  })

  it('counts answers, accuracy and the last attempt and correct times', () => {
    const events = [answer('q1', true), answer('q2', false), answer('q1', false)]
    expect(knowledgeMastery(events, K, { playerId: PLAYER, now })).toMatchObject({
      totalAttempts: 3,
      correctAttempts: 1,
      wrongAttempts: 2,
      accuracy: 1 / 3,
      lastAttemptAt: events[2]!.occurredAt,
      lastCorrectAt: events[0]!.occurredAt,
    })
  })

  // "單次答對不能直接成為 mastered"; under 3 answers is still learning.
  it('is learning under 3 answers, even if all correct', () => {
    expect(level([answer('q1', true)])).toBe('learning')
    expect(level([answer('q1', true), answer('q2', true)])).toBe('learning')
  })

  it('is practicing from 3 answers', () => {
    expect(level([answer('q1', false), answer('q2', true), answer('q3', true)])).toBe('practicing')
  })

  it('is mastered: 5 different questions, 4 of the last 5 right, on 2 days', () => {
    expect(level(fiveQuestions([true, false, true, true, true], [10, 10, 10, 11, 11]))).toBe(
      'mastered',
    )
  })

  // "只靠重複回答同一道題不能達成 mastered".
  it('is not mastered by answering the same question again and again', () => {
    const same = [10, 10, 10, 11, 11].map((d) => answer('q1', true, d))
    expect(level(same)).toBe('practicing')
  })

  // Review loophole: old wrong answers supply the variety, recent rights are one question.
  it('is not mastered when the recent right answers are all the same question', () => {
    const variedButWrong = fiveQuestions([false, false, false, false, false], [10, 10, 10, 10, 10])
    const sameRight = [1, 2, 3, 4, 5].map(() => answer('q1', true, 11))
    expect(level([...variedButWrong, ...sameRight])).toBe('practicing')
  })

  it('is mastered when the recent right answers cover 3 different questions', () => {
    const earlier = fiveQuestions([false, false, false, false, false], [10, 10, 10, 10, 10])
    const recent = ['q1', 'q2', 'q3', 'q1', 'q2'].map((q) => answer(q, true, 11))
    expect(level([...earlier, ...recent])).toBe('mastered')
  })

  // Boundaries: exactly 3 is practicing; 4 right answers is still short of mastered.
  it('switches level exactly at the thresholds', () => {
    expect(level(fiveQuestions([true, true, true], [10, 10, 11]))).toBe('practicing')
    expect(level(fiveQuestions([true, true, true, true], [10, 10, 11, 11]))).toBe('practicing')
  })

  // An answer with no question id can't count as "a different question".
  it('ignores answers that name no question', () => {
    const noId = [10, 10, 11, 11, 11].map((d) => answer('q', true, d, { questionId: undefined }))
    expect(knowledgeMastery(noId, K, { playerId: PLAYER, now }).totalAttempts).toBe(0)
  })

  it('cannot have its shared rules changed', () => {
    expect(Object.isFrozen(MASTERY_RULES)).toBe(true)
  })

  it('needs at least 5 different questions', () => {
    const four = [
      ...fiveQuestions([true, true, true, true], [10, 10, 11, 11]),
      answer('q1', true, 11),
    ]
    expect(level(four)).toBe('practicing')
  })

  // Spread over time, not one sitting (a page reload starts a new session, so days, not sessions).
  it('needs answers on at least 2 different days', () => {
    expect(level(fiveQuestions([true, true, true, true, true], [10, 10, 10, 10, 10]))).toBe(
      'practicing',
    )
  })

  it('needs 80% of the last 5 right', () => {
    expect(level(fiveQuestions([true, false, true, false, true], [10, 10, 10, 11, 11]))).toBe(
      'practicing',
    )
  })

  // "Mastery 必須可以因後續錯誤而重新評估": only the latest 5 count.
  it('drops back to practicing after later mistakes, and the old ones age out', () => {
    const mastered = fiveQuestions([true, true, true, true, true], [10, 10, 10, 11, 11])
    const slipped = [...mastered, answer('q1', false, 12), answer('q2', false, 12)]
    expect(level(slipped)).toBe('practicing')
    const recovered = [...slipped, ...[3, 4, 5, 1, 2].map((q) => answer(`q${q}`, true, 12))]
    expect(level(recovered)).toBe('mastered')
  })

  it('uses only valid answers about this point from this player', () => {
    const noise = [
      answer('q9', true, 10, { knowledgeIds: ['b-wall'] }),
      answer('q9', true, 10, { playerId: 'someone-else' }),
      answer('q9', true, 10, { isCorrect: undefined }),
      answer('q9', true, 10, { eventType: 'quiz_completed' }),
    ]
    expect(knowledgeMastery(noise, K, { playerId: PLAYER, now }).totalAttempts).toBe(0)
  })

  it('reads events in time order whatever order they are given in', () => {
    const events = fiveQuestions([false, false, true, true, true], [10, 10, 11, 11, 11])
    const later = [answer('q1', true, 12), answer('q2', true, 12)]
    // Latest 5 are right only if the day-12 answers count as the newest.
    expect(level([...later, ...events])).toBe('mastered')
  })

  // Thresholds live in one settings object (spec: not scattered in components).
  it('takes its thresholds from the rules it is given', () => {
    const events = [answer('q1', true), answer('q2', true), answer('q3', true)]
    const lenient = {
      ...MASTERY_RULES,
      practicingFrom: 2,
      masteredFrom: 3,
      minDays: 1,
      minQuestions: 3,
    }
    expect(
      knowledgeMastery(events, K, { playerId: PLAYER, now, rules: lenient }).masteryLevel,
    ).toBe('mastered')
  })
})

describe('masteryByPoint', () => {
  it('gives every point of the stage a result, not_started included', () => {
    const result = masteryByPoint([answer('q1', true)], ['b-nucleus', 'b-wall'], {
      playerId: PLAYER,
      now,
    })
    expect(result.map((m) => [m.knowledgeId, m.masteryLevel])).toEqual([
      ['b-nucleus', 'learning'],
      ['b-wall', 'not_started'],
    ])
  })
})
