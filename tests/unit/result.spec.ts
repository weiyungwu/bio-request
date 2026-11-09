import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '@/router'
import { getQuestionBank } from '@/data/questions'
import { useProgressStore } from '@/stores/progress'
import { useQuizStore } from '@/stores/quiz'
import { FIRST_CLEAR_EXP, quizScoreExp } from '@/utils/exp'
import ResultView from '@/views/ResultView.vue'
import type { Question } from '@/types/question'

beforeEach(() => setActivePinia(createPinia()))

describe('quiz EXP (docs/progression.md §2)', () => {
  // Boundaries of every band, including the 60-point floor (§3 測驗最低門檻).
  it.each([
    [0, 0],
    [59, 0],
    [60, 10],
    [79, 10],
    [80, 20],
    [89, 20],
    [90, 30],
    [99, 30],
    [100, 40],
  ])('%i points earn %i EXP', (score, exp) => {
    expect(quizScoreExp(score)).toBe(exp)
  })
})

describe('progress.recordQuizResult (TASK-012)', () => {
  const at = new Date('2026-11-09T10:00:00Z')

  it('records score, cleared status, an activity entry and EXP', () => {
    const p = useProgressStore()
    const award = p.recordQuizResult('bio-01', 80, [], at)
    expect(award).toEqual({ quiz: 20, firstClear: FIRST_CLEAR_EXP, total: 50 })
    expect(p.exp).toBe(50)
    expect(p.courseProgress['bio-01']).toEqual({
      courseId: 'bio-01',
      completed: true,
      bestScore: 80,
      latestScore: 80,
    })
    expect(p.records).toEqual([
      { courseId: 'bio-01', score: 80, passed: true, completedAt: at.toISOString() },
    ])
  })

  // Spec TASK-015 (rule wired here): 重複挑戰不會錯誤累積通關獎勵.
  it('pays the first-clear bonus once, never on a replay', () => {
    const p = useProgressStore()
    p.recordQuizResult('bio-01', 80, [], at)
    expect(p.recordQuizResult('bio-01', 100, [], at)).toEqual({
      quiz: 40,
      firstClear: 0,
      total: 40,
    })
  })

  // A failed retry must not erase a clear or the best score; latest is always the last try.
  it('keeps the best score and cleared status after a worse retry', () => {
    const p = useProgressStore()
    p.recordQuizResult('bio-01', 100, [], at)
    p.recordQuizResult('bio-01', 40, [], at)
    expect(p.courseProgress['bio-01']).toMatchObject({
      completed: true,
      bestScore: 100,
      latestScore: 40,
    })
  })

  it('a failing first attempt earns no bonus and does not clear the stage', () => {
    const p = useProgressStore()
    expect(p.recordQuizResult('bio-01', 60, [], at)).toEqual({ quiz: 10, firstClear: 0, total: 10 })
    expect(p.courseProgress['bio-01']!.completed).toBe(false)
  })
})

describe('ResultView (TASK-012)', () => {
  const pool = getQuestionBank('bio-01')!.questions

  /** Plays a paper in the store, answering `wrong` of the 5 questions incorrectly. */
  function play(wrong: number) {
    const quiz = useQuizStore()
    quiz.start('bio-01', pool)
    quiz.questions.forEach((q: Question, i) => {
      const bad = i < wrong
      if (q.type === 'single_choice' || q.type === 'true_false') {
        quiz.choose(0, bad ? (q.answer + 1) % q.options.length : q.answer)
      } else {
        const key = bad ? [...q.answer].reverse() : q.answer
        key.forEach((v, slot) => quiz.choose(slot, v))
      }
      quiz.submit()
      quiz.next()
    })
    return quiz
  }

  async function mountResult(path = '/result/bio-01') {
    const router = createAppRouter(createMemoryHistory())
    await router.push(path)
    const w = mount(ResultView, { global: { plugins: [router] }, attachTo: document.body })
    await flushPromises()
    return w
  }

  // Spec: 本次分數、答對題數、答錯題數、通過或未通過、EXP 獲得量.
  it('shows score, counts, verdict and EXP earned', async () => {
    play(1)
    const w = await mountResult()
    expect(w.find('[data-testid="result-score"]').text()).toBe('80 分')
    expect(w.find('[data-testid="result-verdict"]').text()).toContain('通過')
    expect(w.find('[data-testid="result-counts"]').text()).toMatch(/答對 4 題 · 答錯 1 題/)
    const exp = w.find('[data-testid="result-exp"]').text()
    expect(exp).toContain('+50')
    expect(exp).toContain('測驗分數獎勵 +20')
    expect(exp).toContain('首次通關獎勵 +30')
    expect(document.activeElement?.tagName).toBe('H1')
    w.unmount()
  })

  // Spec: 錯題補強入口 — each wrong question with the student's answer, the key and why.
  it('lists every wrong question with both answers and the explanation', async () => {
    const quiz = play(2)
    const w = await mountResult()
    const items = w.findAll('[data-testid="result-wrong"]')
    expect(items).toHaveLength(2)
    const q = quiz.questions[0]!
    expect(items[0]!.text()).toContain(q.question)
    expect(items[0]!.text()).toContain('你的答案：')
    expect(items[0]!.text()).toContain('正確答案：')
    expect(items[0]!.text()).toContain(q.explanation)
    w.unmount()
  })

  it('says so when nothing needs review, and fails below 80 with no EXP under 60', async () => {
    play(0)
    let w = await mountResult()
    expect(w.find('[data-testid="result-review"]').text()).toContain('全部答對')
    w.unmount()
    play(3)
    w = await mountResult()
    expect(w.find('[data-testid="result-verdict"]').text()).toContain('未通過')
    expect(w.find('[data-testid="result-exp"]').text()).toContain('60 分以上才能獲得 EXP')
    w.unmount()
  })

  // Spec: 再挑戰按鈕.
  it('offers a retry that opens the quiz', async () => {
    play(1)
    const w = await mountResult()
    expect(w.find('[data-testid="result-retry"]').attributes('href')).toBe('/quiz/bio-01')
    w.unmount()
  })

  // After a reload the in-memory attempt is gone; say so instead of showing zeros.
  it('shows an empty state when there is no attempt for this stage', async () => {
    const w = await mountResult()
    expect(w.find('[data-testid="result-empty"]').exists()).toBe(true)
    expect(w.find('[data-testid="result-score"]').exists()).toBe(false)
    w.unmount()
  })
})
