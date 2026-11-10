import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProgressStore } from '@/stores/progress'
import { useQuizStore } from '@/stores/quiz'
import type { Question } from '@/types/question'
import {
  correctAnswerText,
  drawQuestions,
  emptyResponse,
  hasRepeats,
  isAnswered,
  isCorrect,
  isPassing,
  scoreOf,
} from '@/utils/quiz'

const base = {
  courseId: 'bio-01',
  topic: 't',
  knowledgeIds: ['k'],
  difficulty: 'easy' as const,
  question: 'q',
  explanation: 'e',
  source: 's',
}
const single: Question = {
  ...base,
  id: 'bio-01-s',
  type: 'single_choice',
  options: ['A', 'B', 'C'],
  answer: 1,
}
const tf: Question = {
  ...base,
  id: 'bio-01-tf',
  type: 'true_false',
  options: ['對', '錯'],
  answer: 1,
}
const matching: Question = {
  ...base,
  id: 'bio-01-m',
  type: 'matching',
  options: { left: ['甲', '乙'], right: ['一', '二'] },
  answer: [1, 0],
}
const ordering: Question = {
  ...base,
  id: 'bio-01-o',
  type: 'ordering',
  options: ['X', 'Y', 'Z'],
  answer: [2, 0, 1],
}
const pool: Question[] = Array.from({ length: 8 }, (_, i) => ({ ...single, id: `bio-01-q${i}` }))

describe('quiz engine (TASK-011)', () => {
  // Spec: 總分 = 正確題數 / 題目總數 × 100; 通過 = 總分 >= 80.
  it('scores correct / total × 100 and passes at 80', () => {
    expect([0, 1, 2, 3, 4, 5].map((c) => scoreOf(c, 5))).toEqual([0, 20, 40, 60, 80, 100])
    expect(scoreOf(0, 0)).toBe(0)
    expect(isPassing(80)).toBe(true)
    expect(isPassing(79)).toBe(false)
  })

  // Spec: 答案判斷 for every type.
  it.each([
    [single, [1], true],
    [single, [0], false],
    [tf, [1], true],
    [tf, [0], false],
    [matching, [1, 0], true],
    [matching, [0, 1], false],
    [ordering, [2, 0, 1], true],
    [ordering, [0, 1, 2], false],
  ] as const)('judges %#', (q, response, expected) => {
    expect(isCorrect(q, [...response])).toBe(expected)
  })

  // Matching/ordering are all-or-nothing: half right is still a wrong answer.
  it('marks a partly right matching or ordering answer wrong', () => {
    expect(isCorrect(ordering, [2, 1, 0])).toBe(false)
    expect(isCorrect(matching, [1, null])).toBe(false)
  })

  it('needs every slot filled to count as answered', () => {
    expect(emptyResponse(single)).toEqual([null])
    expect(emptyResponse(matching)).toEqual([null, null])
    expect(emptyResponse(ordering)).toEqual([null, null, null])
    expect(isAnswered([1, null])).toBe(false)
    expect(isAnswered([0, 1])).toBe(true)
  })

  // Review I1: a repeated pick can never match a permutation key.
  it('spots an item used twice', () => {
    expect(hasRepeats([0, 0, 1])).toBe(true)
    expect(hasRepeats([0, null, null])).toBe(false)
    expect(hasRepeats([2, 0, 1])).toBe(false)
  })

  // Spec: 同一題不會在同一份試卷中重複出現; 隨機抽題.
  it('draws distinct questions, differently across draws', () => {
    const draws = new Set<string>()
    for (let n = 0; n < 30; n++) {
      const ids = drawQuestions(pool, 5).map((q) => q.id)
      expect(new Set(ids).size).toBe(5)
      draws.add(ids.join())
    }
    expect(draws.size).toBeGreaterThan(1)
  })

  // 顯示解答 must be readable for every type, not an index.
  it('spells out the correct answer', () => {
    expect(correctAnswerText(single)).toBe('B')
    expect(correctAnswerText(tf)).toBe('錯')
    expect(correctAnswerText(matching)).toBe('甲 → 二；乙 → 一')
    expect(correctAnswerText(ordering)).toBe('Z → X → Y')
  })
})

describe('quiz store (TASK-011)', () => {
  const fresh = () => {
    setActivePinia(createPinia())
    const s = useQuizStore()
    s.start('bio-01', pool)
    return s
  }
  const answerAll = (s: ReturnType<typeof useQuizStore>, wrong: number[] = []) => {
    for (let i = 0; i < 5; i++) {
      s.choose(0, wrong.includes(i) ? 0 : 1)
      s.submit()
      s.next()
    }
  }

  it('draws 5 questions', () => {
    expect(fresh().questions).toHaveLength(5)
  })

  // Spec: 未作答不可直接提交.
  it('refuses to submit an unanswered question', () => {
    const s = fresh()
    s.submit()
    expect(s.isSubmitted).toBe(false)
    s.next()
    expect(s.index).toBe(0)
  })

  // Review S3: a fast double click on 下一題 must not skip an unanswered question.
  // Review I1: 看成績 clicked twice must not pay EXP or log the attempt twice.
  it('records a finished paper exactly once', () => {
    const s = fresh()
    answerAll(s)
    const award = s.award
    s.next()
    s.next()
    const progress = useProgressStore()
    expect(progress.records).toHaveLength(1)
    expect(progress.exp).toBe(award!.total)
    expect(s.award).toBe(award)
  })

  // TASK-013: the finished paper's wrong questions are saved for the 錯題本.
  it('saves the ids of the questions answered wrong', () => {
    const s = fresh()
    answerAll(s, [1, 3])
    const ids = [s.questions[1]!.id, s.questions[3]!.id].sort()
    expect(Object.keys(useProgressStore().wrongQuestions).sort()).toEqual(ids)
  })

  it('ignores a repeated submit or next', () => {
    const s = fresh()
    s.choose(0, 1)
    s.submit()
    s.submit()
    s.next()
    s.next()
    expect(s.index).toBe(1)
    expect(s.isSubmitted).toBe(false)
  })

  it('ignores a slot that does not exist', () => {
    const s = fresh()
    s.choose(3, 1)
    s.choose(-1, 1)
    expect(s.response).toEqual([null])
  })

  // Review S1: a refused start must not leave the last course's attempt behind.
  it('reset forgets the attempt', () => {
    const s = fresh()
    s.reset()
    expect([s.courseId, s.questions.length, s.finished]).toEqual([null, 0, false])
  })

  // Feedback is shown right after submitting, so the answer can't change afterwards.
  it('locks the answer once submitted', () => {
    const s = fresh()
    s.choose(0, 0)
    s.submit()
    s.choose(0, 1)
    expect(s.response).toEqual([0])
    expect(s.results[0]!.correct).toBe(false)
  })

  it('scores the paper: one wrong out of five is 80 and passes', () => {
    const s = fresh()
    answerAll(s, [2])
    expect(s.finished).toBe(true)
    expect(s.correctCount).toBe(4)
    expect(s.score).toBe(80)
    expect(s.passed).toBe(true)
  })

  it('two wrong is 60 and does not pass', () => {
    const s = fresh()
    answerAll(s, [0, 4])
    expect(s.score).toBe(60)
    expect(s.passed).toBe(false)
  })

  // Spec: 重新開始測驗時，清除上一輪暫存答案.
  it('restarting clears every answer from the last round', () => {
    const s = fresh()
    answerAll(s)
    s.start('bio-01', pool)
    expect(s.finished).toBe(false)
    expect(s.index).toBe(0)
    expect(s.responses).toEqual([[null], [null], [null], [null], [null]])
    expect(s.isSubmitted).toBe(false)
    expect(s.correctCount).toBe(0)
  })

  // The bank's objects are shared across attempts; playing must not alter them.
  it('leaves the bank untouched', () => {
    const before = JSON.stringify(pool)
    answerAll(fresh())
    expect(JSON.stringify(pool)).toBe(before)
  })
})
