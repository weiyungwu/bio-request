import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProgressStore } from '@/stores/progress'
import { getQuestionBank } from '@/data/questions'
import { useQuizStore } from '@/stores/quiz'
import type { Question } from '@/types/question'
import {
  QUIZ_SIZE,
  QUIZ_TOPIC_QUOTAS,
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

  // Human decision (2026-11-11): batch 1 made unit A 15 of stage 1's 24 questions, so a
  // plain draw left out cells in about 1 quiz in 14. Every stage-1 quiz has at least 2 cell questions.
  const bank = getQuestionBank('bio-01')!.questions
  const quota = QUIZ_TOPIC_QUOTAS['bio-01']!
  const cellsIn = (qs: readonly Question[]) => qs.filter((q) => quota.topics.includes(q.topic))

  it('a stage 1 draw always has at least 2 cell questions, and is still random', () => {
    const unitA = new Set<number>()
    for (let n = 0; n < 20000; n++) {
      const qs = drawQuestions(bank, QUIZ_SIZE, Math.random, quota)
      expect(cellsIn(qs).length).toBeGreaterThanOrEqual(2)
      expect(new Set(qs.map((q) => q.id)).size).toBe(QUIZ_SIZE)
      unitA.add(QUIZ_SIZE - cellsIn(qs).length)
    }
    // Unit A can fill anywhere from none to the 3 places left. Since batch 3 unit A is 48
    // of 65, so all-cells is about 1 draw in 1250; 20000 draws make a miss vanishingly unlikely.
    expect([...unitA].sort()).toEqual([0, 1, 2, 3])
  })

  // Without the quota about 3 stage-1 quizzes in 5 have under 2 cell questions; 50 starts catch it.
  it('the quiz store applies the stage quota', () => {
    setActivePinia(createPinia())
    const s = useQuizStore()
    for (let n = 0; n < 50; n++) {
      s.start('bio-01', bank)
      expect(cellsIn(s.questions).length).toBeGreaterThanOrEqual(2)
    }
  })

  // Human decision (2026-11-11): batch 3 made 25 of stage 1's 65 questions hard. Drawn
  // without the topic quota (whose cell questions are not hard yet, so it alone keeps
  // stage 1 under 4), about 1 quiz in 15 would have 4 or 5; 1000 draws catch that.
  it('a draw has at most 3 hard questions', () => {
    const hardCounts = new Set<number>()
    for (let n = 0; n < 1000; n++) {
      const qs = drawQuestions(bank, QUIZ_SIZE)
      const hard = qs.filter((q) => q.difficulty === 'hard').length
      expect(hard).toBeLessThanOrEqual(3)
      expect(new Set(qs.map((q) => q.id)).size).toBe(QUIZ_SIZE)
      hardCounts.add(hard)
    }
    // The cap limits hard questions, it doesn't remove them: 3 is still reached.
    expect(hardCounts.has(3)).toBe(true)
  })

  // The cap on its own: with enough other questions, never more than 3 hard.
  const make = (n: number, difficulty: Question['difficulty'], topic = 't'): Question[] =>
    Array.from({ length: n }, (_, i) => ({
      ...single,
      id: `${topic}-${difficulty}-${i}`,
      topic,
      difficulty,
    }))
  it('caps hard questions at 3 when others can fill the quiz', () => {
    for (let n = 0; n < 200; n++) {
      const qs = drawQuestions([...make(2, 'easy'), ...make(10, 'hard')], QUIZ_SIZE)
      expect(qs.filter((q) => q.difficulty === 'hard')).toHaveLength(3)
      expect(qs.filter((q) => q.difficulty === 'easy')).toHaveLength(2)
    }
  })

  // Too few others: go over the cap only as far as needed to fill the quiz.
  it('goes over the cap only as far as a full quiz needs', () => {
    for (let n = 0; n < 200; n++) {
      const qs = drawQuestions([...make(1, 'medium'), ...make(10, 'hard')], QUIZ_SIZE)
      expect(qs.filter((q) => q.difficulty === 'medium')).toHaveLength(1)
      expect(new Set(qs.map((q) => q.id)).size).toBe(QUIZ_SIZE)
    }
  })

  // Units B and C will add hard cell questions: quota and cap must hold together.
  it('keeps the quota and the cap when the quota topics are all hard', () => {
    const pool = [...make(6, 'hard', 'x'), ...make(10, 'easy', 'y')]
    for (let n = 0; n < 200; n++) {
      const qs = drawQuestions(pool, QUIZ_SIZE, Math.random, { topics: ['x'], min: 2 })
      expect(qs.filter((q) => q.topic === 'x').length).toBeGreaterThanOrEqual(2)
      expect(qs.filter((q) => q.difficulty === 'hard').length).toBeLessThanOrEqual(3)
      expect(new Set(qs.map((q) => q.id)).size).toBe(QUIZ_SIZE)
    }
  })

  // The fallback must not leave its questions always at the end.
  it('mixes the order of a capped draw', () => {
    const lastIsMedium = new Set<boolean>()
    for (let n = 0; n < 200; n++) {
      const qs = drawQuestions([...make(1, 'medium'), ...make(10, 'hard')], QUIZ_SIZE)
      lastIsMedium.add(qs[QUIZ_SIZE - 1]!.difficulty === 'medium')
    }
    expect(lastIsMedium).toEqual(new Set([true, false]))
  })

  it('a bank of only hard questions still draws a full quiz', () => {
    const allHard = bank.filter((q) => q.difficulty === 'hard')
    const qs = drawQuestions(allHard, QUIZ_SIZE, Math.random, quota)
    expect(new Set(qs.map((q) => q.id)).size).toBe(QUIZ_SIZE)
  })

  it('a quota the bank cannot meet still draws a full quiz', () => {
    const ids = drawQuestions(pool, 5, Math.random, { topics: ['沒有這個主題'], min: 2 })
    expect(new Set(ids.map((q) => q.id)).size).toBe(5)
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
