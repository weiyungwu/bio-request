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
import { PLAYER_KEY } from '@/utils/learningEvents'
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
    for (let i = 0; i < 5; i++) play(quiz, true)
    await flushPromises()
    await w.find('[data-testid="practice-again"]').trigger('click')
    expect(quiz.finished).toBe(false)
    expect(quiz.index).toBe(0)
    expect(w.find('[data-testid="quiz-submit"]').exists()).toBe(true)
  })

  // §20 5.2: 同一 Knowledge 連續答錯 → 推薦對應教材與提示. Seeded, not played: which points a
  // played practice reaches depends on the draw (Phase C review I1).
  describe('lesson card first', () => {
    const wrongTwice = () => {
      localStorage.setItem(PLAYER_KEY, 'me')
      const at = (s: number) => new Date(Date.UTC(2026, 10, 10, 0, 0, s)).toISOString()
      const wrong = (id: string, s: number): LearningEvent => ({
        id: `seed${s}`,
        playerId: 'me',
        sessionId: 's',
        eventType: 'question_answered',
        knowledgeIds: ['a-response'],
        questionId: id,
        isCorrect: false,
        source: '2d',
        occurredAt: at(s),
        recordedAt: at(s),
      })
      const [a, b] = bank.filter((q) => q.knowledgeIds.join() === 'a-response')
      localStorage.setItem(
        EVENTS_KEY,
        JSON.stringify({ version: 1, events: [wrong(a!.id, 1), wrong(b!.id, 2)] }),
      )
    }

    it('shows the card before the questions, and starts the practice only after it', async () => {
      wrongTwice()
      const { w, quiz } = await mountAt('/practice/bio-01', PracticeView)
      expect(w.find('[data-testid="practice-reason"]').text()).toBe(
        '感應與反應：連續答錯 2 次，建議先看教材複習',
      )
      expect(w.findAll('[data-testid="practice-card"]')).toHaveLength(1)
      expect(w.find('[data-testid="practice-card"]').text()).toContain('感應與反應')
      // Not beside the questions, and nothing started yet: leaving now logs nothing.
      expect(w.find('[data-testid="quiz-submit"]').exists()).toBe(false)
      expect(events().filter((e) => e.eventType === 'quiz_started')).toHaveLength(0)
      await w.find('[data-testid="practice-start"]').trigger('click')
      expect(w.find('[data-testid="practice-lesson"]').exists()).toBe(false)
      expect(quiz.kind).toBe('practice')
      expect(quiz.questions).toHaveLength(5)
      expect(events().filter((e) => e.eventType === 'quiz_started')).toHaveLength(1)
    })

    // Review I2: 再練一次 disappears with the result; focus must stay in the page.
    it('再練一次 back to the card moves focus to its heading', async () => {
      wrongTwice()
      const { w, quiz } = await mountAt('/practice/bio-01', PracticeView)
      await w.find('[data-testid="practice-start"]').trigger('click')
      // a-response (0% with 2 answers) is the first target, so it reaches 3 wrong: weak.
      for (let i = 0; i < 5; i++) play(quiz, false)
      await flushPromises()
      document.body.append(w.element)
      ;(w.find('[data-testid="practice-again"]').element as HTMLElement).focus()
      await w.find('[data-testid="practice-again"]').trigger('click')
      await flushPromises()
      expect(w.find('[data-testid="practice-lesson"]').exists()).toBe(true)
      expect(document.activeElement?.id).toBe('practice-lesson-title')
      w.unmount()
    })
  })

  // §20 5.5: 必須允許學生自行選擇其他學習內容 — from 知識掌握度's 練這個.
  it('practises the point chosen in the link', async () => {
    const { w, quiz } = await mountAt('/practice/bio-01?k=b-nucleus', PracticeView)
    expect(w.find('[data-testid="practice-targets"]').text()).toContain('你選的知識點')
    expect(w.findAll('[data-testid="practice-reason"]').map((r) => r.text())).toEqual([
      '細胞核：還沒作答過',
    ])
    expect(quiz.questions).toHaveLength(5)
    expect(quiz.questions.every((q) => q.knowledgeIds.includes('b-nucleus'))).toBe(true)
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
