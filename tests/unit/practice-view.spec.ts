import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { getQuestionBank } from '@/data/questions'
import { createAppRouter } from '@/router'
import { useProgressStore } from '@/stores/progress'
import { useQuizStore } from '@/stores/quiz'
import type { LearningEvent } from '@/types/learningEvent'
import type { Question } from '@/types/question'
import { EVENTS_KEY } from '@/utils/learningEventStorage'
import HomeView from '@/views/HomeView.vue'
import MasteryView from '@/views/MasteryView.vue'
import PracticeView from '@/views/PracticeView.vue'
import ResultView from '@/views/ResultView.vue'

// v1.1 Phase 2 弱點練習: the page, and the quiz store's practice mode behind it.
const bank = getQuestionBank('bio-01')!.questions
const events = (): LearningEvent[] =>
  JSON.parse(localStorage.getItem(EVENTS_KEY) ?? '{"events":[]}').events

/** Answers the current question from the key (or wrong), submits it and moves on. */
function play(quiz: ReturnType<typeof useQuizStore>, right: boolean) {
  const q = quiz.current as Question
  if (typeof q.answer === 'number') {
    const n = q.type === 'true_false' || q.type === 'single_choice' ? q.options.length : 2
    quiz.choose(0, right ? q.answer : (q.answer + 1) % n)
  } else {
    const key = right ? q.answer : [...q.answer].reverse()
    key.forEach((v, slot) => quiz.choose(slot, v))
  }
  quiz.submit()
  quiz.next()
}

async function mountAt(path: string, view: unknown) {
  setActivePinia(createPinia())
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  const w = mount(view as typeof PracticeView, { global: { plugins: [router] } })
  await flushPromises()
  return { w, router, quiz: useQuizStore(), progress: useProgressStore() }
}

describe('quiz store practice mode', () => {
  // Human decision: practice is not a stage attempt.
  it('records a practice, not a stage attempt, and logs it as practice', () => {
    setActivePinia(createPinia())
    const quiz = useQuizStore()
    const progress = useProgressStore()
    quiz.startPractice('bio-01', bank.slice(0, 5))
    for (let i = 0; i < 5; i++) play(quiz, i !== 0)
    expect(quiz.award).toMatchObject({ quiz: 20, firstClear: 0, newBadges: [] })
    expect(progress.records).toEqual([])
    expect(progress.courseProgress).toEqual({})
    expect(progress.practice).toHaveLength(1)
    expect(Object.keys(progress.wrongQuestions)).toEqual([bank[0]!.id])
    // Mastery reads question_answered events; practice ones are told apart by activity id.
    const answers = events().filter((e) => e.eventType === 'question_answered')
    expect(answers).toHaveLength(5)
    expect(answers.every((e) => e.activityId?.startsWith('practice:bio-01:'))).toBe(true)
  })

  it('a stage quiz started afterwards is a stage quiz again', () => {
    setActivePinia(createPinia())
    const quiz = useQuizStore()
    quiz.startPractice('bio-01', bank.slice(0, 5))
    quiz.start('bio-01', bank)
    for (let i = 0; i < 5; i++) play(quiz, true)
    expect(useProgressStore().records).toHaveLength(1)
  })

  // The stage result page must not present a practice as the stage's quiz result.
  it('the stage result page ignores a finished practice', async () => {
    const { w, quiz } = await mountAt('/result/bio-01', ResultView)
    quiz.startPractice('bio-01', bank.slice(0, 5))
    for (let i = 0; i < 5; i++) play(quiz, true)
    await flushPromises()
    expect(w.find('[data-testid="result-empty"]').exists()).toBe(true)
  })
})

describe('PracticeView', () => {
  it('starts 5 questions on the chosen points, then shows the score and each change', async () => {
    const { w, quiz, progress } = await mountAt('/practice/bio-01', PracticeView)
    expect(quiz.kind).toBe('practice')
    expect(quiz.questions).toHaveLength(5)
    const targets = w.find('[data-testid="practice-targets"]').text()
    expect(targets).toContain('這次練習')
    // §20 5.4: each point says why it was picked; nothing answered yet here.
    const reasons = w.findAll('[data-testid="practice-reason"]')
    expect(reasons).toHaveLength(3)
    for (const r of reasons) expect(r.text()).toContain('還沒作答過')
    for (let i = 0; i < 5; i++) play(quiz, true)
    await flushPromises()
    expect(w.find('[data-testid="practice-score"]').text()).toBe('100 分')
    expect(w.find('[data-testid="practice-exp"]').text()).toContain('+40')
    expect(progress.exp).toBe(40)
    const rows = w.findAll('[data-testid="practice-point"]')
    expect(rows).toHaveLength(3)
    // Before: nothing answered. After: worked out from the saved answers, so it moved on.
    for (const row of rows) {
      expect(row.text()).toContain('未開始')
      expect(row.find('[data-testid="practice-after"]').text()).not.toContain('未開始')
      expect(row.text()).toMatch(/最近答對 [1-9]\d*%/)
    }
    expect(w.find('[data-testid="practice-to-review"]').exists()).toBe(false)
  })

  // Phase v1.1-2 S-03: a perfect practice still points to mistakes waiting from before.
  it('links to the 錯題本 after a perfect practice while older mistakes wait', async () => {
    const { w, quiz, progress } = await mountAt('/practice/bio-01', PracticeView)
    progress.recordQuizResult('bio-01', 80, ['bio-01-q01'])
    for (let i = 0; i < 5; i++) play(quiz, true)
    await flushPromises()
    expect(w.find('[data-testid="practice-to-review"]').text()).toContain('1 題待複習')
  })

  it('再練一次 starts a new practice', async () => {
    const { w, quiz } = await mountAt('/practice/bio-01', PracticeView)
    for (let i = 0; i < 5; i++) play(quiz, false)
    await flushPromises()
    expect(w.find('[data-testid="practice-to-review"]').exists()).toBe(true)
    await w.find('[data-testid="practice-again"]').trigger('click')
    expect(quiz.finished).toBe(false)
    expect(quiz.index).toBe(0)
    // All wrong: the lesson cards come first (§20 5.2), then the questions.
    expect(w.find('[data-testid="practice-lesson"]').exists()).toBe(true)
    expect(w.find('[data-testid="quiz-submit"]').exists()).toBe(false)
    await w.find('[data-testid="practice-start"]').trigger('click')
    expect(w.find('[data-testid="quiz-submit"]').exists()).toBe(true)
  })

  it('a locked stage cannot be practised', async () => {
    const { router } = await mountAt('/practice/bio-02', PracticeView)
    expect(router.currentRoute.value.name).toBe('map')
  })
})

describe('practice entry points', () => {
  it('知識掌握度 links to practice for each open stage', async () => {
    const { w } = await mountAt('/mastery', MasteryView)
    expect(w.find('[data-testid="mastery-practice"]').attributes('href')).toBe('/practice/bio-01')
  })

  it('home links to practice', async () => {
    const { w } = await mountAt('/', HomeView)
    expect(w.find('[data-testid="home-practice-link"]').attributes('href')).toBe('/practice/bio-01')
  })
})
