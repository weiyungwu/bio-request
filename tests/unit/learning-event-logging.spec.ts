import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { getQuestionBank } from '@/data/questions'
import { useProgressStore } from '@/stores/progress'
import { useQuizStore } from '@/stores/quiz'
import type { LearningEvent } from '@/types/learningEvent'
import type { SingleChoiceQuestion } from '@/types/question'
import { EVENTS_KEY } from '@/utils/learningEventStorage'
import { PLAYER_KEY } from '@/utils/learningEvents'

// v1.1 step 3: every answer is kept as its own event (rules 3–4), so mastery can later be
// worked out per knowledge point. Single-choice questions keep the answers easy to steer.
const pool = getQuestionBank('bio-01')!.questions.filter(
  (q): q is SingleChoiceQuestion => q.type === 'single_choice',
)

function reload() {
  setActivePinia(createPinia())
  return { quiz: useQuizStore(), progress: useProgressStore() }
}
const events = (): LearningEvent[] =>
  JSON.parse(localStorage.getItem(EVENTS_KEY) ?? '{"events":[]}').events

/** Answers the current question right or wrong, then submits it. */
function answer(quiz: ReturnType<typeof useQuizStore>, right: boolean) {
  const q = quiz.current as SingleChoiceQuestion
  quiz.choose(0, right ? q.answer : (q.answer + 1) % q.options.length)
  quiz.submit()
}

describe('quiz events', () => {
  it('records the start, every answer and the end of one attempt', () => {
    const { quiz } = reload()
    quiz.start('bio-01', pool)
    const drawn = [...quiz.questions]
    for (let i = 0; i < drawn.length; i++) {
      answer(quiz, i !== 1)
      quiz.submit() // a second submit of the same answer is not a second event
      quiz.next()
    }

    const log = events()
    expect(log.map((e) => e.eventType)).toEqual([
      'quiz_started',
      ...drawn.map(() => 'question_answered'),
      'quiz_completed',
    ])
    // One attempt: all its events share an activity id naming the stage.
    const activity = log[0]!.activityId!
    expect(activity).toMatch(/^quiz:bio-01:.+/)
    expect(log.every((e) => e.activityId === activity)).toBe(true)
    expect(log.every((e) => e.source === '2d' && e.playerId === log[0]!.playerId)).toBe(true)

    const answers = log.filter((e) => e.eventType === 'question_answered')
    expect(answers.map((e) => e.questionId)).toEqual(drawn.map((q) => q.id))
    expect(answers.map((e) => e.knowledgeIds)).toEqual(drawn.map((q) => q.knowledgeIds))
    expect(answers.map((e) => e.isCorrect)).toEqual(drawn.map((_, i) => i !== 1))
  })

  // An attempt that is started again counts as a new one (and the old one as abandoned).
  it('gives a restarted quiz a new activity id', () => {
    const { quiz } = reload()
    quiz.start('bio-01', pool)
    answer(quiz, true)
    quiz.start('bio-01', pool)
    const started = events().filter((e) => e.eventType === 'quiz_started')
    expect(started).toHaveLength(2)
    expect(started[0]!.activityId).not.toBe(started[1]!.activityId)
  })

  // Rule 4: answering the same question in a later attempt adds, never replaces.
  it('keeps earlier answers when a question is answered again', () => {
    const { quiz } = reload()
    for (const right of [false, true]) {
      quiz.start('bio-01', [pool[0]!])
      answer(quiz, right)
    }
    const answers = events().filter((e) => e.eventType === 'question_answered')
    expect(answers.map((e) => [e.questionId, e.isCorrect])).toEqual([
      [pool[0]!.id, false],
      [pool[0]!.id, true],
    ])
  })
})

describe('錯題本 events', () => {
  it('records each retry as an answer from the review page', () => {
    const { progress } = reload()
    progress.recordQuizResult('bio-01', 60, ['bio-01-q05'])
    progress.recordReviewAnswer('bio-01-q05', false)
    progress.recordReviewAnswer('bio-01-q05', true)
    const log = events()
    expect(log.map((e) => [e.eventType, e.activityId, e.questionId, e.isCorrect])).toEqual([
      ['question_answered', 'review', 'bio-01-q05', false],
      ['question_answered', 'review', 'bio-01-q05', true],
    ])
    expect(log[0]!.knowledgeIds).toEqual(getKnowledgeIds('bio-01-q05'))
  })

  it('records nothing for a question that is not in the 錯題本', () => {
    reload().progress.recordReviewAnswer('bio-01-q05', true)
    expect(events()).toEqual([])
  })
})

describe('player id and reset', () => {
  // Rule 6: an anonymous id per browser, kept across visits; no personal data.
  it('uses one anonymous player id across reloads', async () => {
    reload().progress.recordQuizResult('bio-01', 60, ['bio-01-q05'])
    await nextTick() // progress is saved by a watcher
    reload().progress.recordReviewAnswer('bio-01-q05', true)
    reload().progress.recordReviewAnswer('bio-01-q05', false)
    const ids = new Set(events().map((e) => e.playerId))
    expect(ids.size).toBe(1)
    expect(localStorage.getItem(PLAYER_KEY)).toBe([...ids][0])
  })

  // 重設學習資料 removes the learning history too (Human decision, 2026-11-10).
  it('重設學習資料 also clears the learning events', () => {
    const { quiz, progress } = reload()
    quiz.start('bio-01', pool)
    progress.resetAll()
    expect(localStorage.getItem(EVENTS_KEY)).toBeNull()
  })

  // R3: storage full or disabled — events are lost, the quiz is not.
  it('keeps the quiz going when events cannot be saved', () => {
    const { quiz } = reload()
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    try {
      quiz.start('bio-01', pool)
      answer(quiz, true)
      expect(quiz.isSubmitted).toBe(true)
    } finally {
      spy.mockRestore()
    }
  })
})

function getKnowledgeIds(id: string) {
  return getQuestionBank('bio-01')!.questions.find((q) => q.id === id)!.knowledgeIds
}
