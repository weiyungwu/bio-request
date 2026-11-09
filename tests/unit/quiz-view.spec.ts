import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '@/router'
import QuizView from '@/views/QuizView.vue'
import QuizQuestion from '@/components/quiz/QuizQuestion.vue'
import { getQuestionBank } from '@/data/questions'
import type { Question, QuestionBank } from '@/types/question'

const real = getQuestionBank('bio-01')!
const bank = vi.hoisted(() => ({ current: null as QuestionBank | null }))
vi.mock('@/data/questions', async (orig) => {
  const mod = await orig<typeof import('@/data/questions')>()
  return { getQuestionBank: (id: string) => bank.current ?? mod.getQuestionBank(id) }
})

const byType = (t: Question['type']) => real.questions.find((q) => q.type === t)!

async function mountQuiz() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createAppRouter(createMemoryHistory())
  await router.push('/quiz/bio-01')
  const w = mount(QuizView, { global: { plugins: [router, pinia] }, attachTo: document.body })
  await flushPromises()
  return w
}
type W = Awaited<ReturnType<typeof mountQuiz>>

/** Answers the current question (correctly unless `wrong`) and submits. */
async function answer(w: W, wrong = false) {
  const q = w.findComponent(QuizQuestion).props('question') as Question
  if (q.type === 'single_choice' || q.type === 'true_false') {
    const i = wrong ? (q.answer + 1) % q.options.length : q.answer
    await w.find(`[data-testid="quiz-option"][data-index="${i}"]`).trigger('click')
  } else {
    const key = wrong ? [...q.answer].reverse() : q.answer
    const selects = w.findAll('[data-testid="quiz-select"]')
    for (const [slot, s] of selects.entries()) await s.setValue(String(key[slot]))
  }
  await w.find('[data-testid="quiz-submit"]').trigger('click')
}

beforeEach(() => {
  bank.current = null
})

describe('QuizView (TASK-011)', () => {
  // Spec page 5: 作答進度、剩餘題數.
  it('shows progress and how many questions remain', async () => {
    const w = await mountQuiz()
    expect(w.find('[data-testid="quiz-progress"]').text()).toBe('第 1 / 5 題 · 還剩 5 題')
    await answer(w)
    expect(w.find('[data-testid="quiz-progress"]').text()).toBe('第 1 / 5 題 · 還剩 4 題')
    w.unmount()
  })

  // Spec: 未作答不可直接提交 — and the student is told why (Gemini Phase 0 #10).
  it('disables submit with a reason until answered', async () => {
    const w = await mountQuiz()
    const submit = w.find('[data-testid="quiz-submit"]')
    expect(submit.attributes('disabled')).toBeDefined()
    expect(w.find('[data-testid="quiz-submit-hint"]').text()).not.toBe('')
    w.unmount()
  })

  // Spec: 判斷正確與否、顯示解答; FR-05 答題回饋立即顯示.
  it('shows the verdict, the correct answer and the explanation right after submitting', async () => {
    const w = await mountQuiz()
    const q = w.findComponent(QuizQuestion).props('question') as Question
    await answer(w, true)
    const fb = w.find('[data-testid="quiz-feedback"]').text()
    expect(fb).toContain('答錯了')
    expect(fb).toContain('正確答案：')
    expect(fb).toContain(q.explanation)
    expect(document.activeElement?.getAttribute('data-testid')).toBe('quiz-feedback')
    w.unmount()
  })

  it('scores the paper at the end and restarts with nothing kept', async () => {
    const w = await mountQuiz()
    for (let n = 0; n < 5; n++) {
      await answer(w, n === 0)
      await w.find('[data-testid="quiz-next"]').trigger('click')
    }
    expect(w.find('[data-testid="quiz-score"]').text()).toBe('80 分')
    expect(w.find('[data-testid="quiz-verdict"]').text()).toContain('通過')
    await flushPromises()
    expect(document.activeElement?.id).toBe('quiz-result-title')

    await w.find('[data-testid="quiz-restart"]').trigger('click')
    expect(w.find('[data-testid="quiz-progress"]').text()).toBe('第 1 / 5 題 · 還剩 5 題')
    expect(w.find('[data-testid="quiz-submit"]').attributes('disabled')).toBeDefined()
    expect(w.findAll('[aria-pressed="true"]')).toHaveLength(0)
    w.unmount()
  })

  // TASK-010: 缺少必要欄位時能顯示資料錯誤; the valid questions still make a paper.
  it('lists data errors and still runs with enough valid questions', async () => {
    bank.current = {
      questions: real.questions,
      errors: [{ index: 3, id: 'bio-01-q04', message: '第 4 題（bio-01-q04）：缺少 explanation' }],
    }
    const w = await mountQuiz()
    expect(w.find('[data-testid="quiz-data-error"]').text()).toContain(
      '第 4 題（bio-01-q04）：缺少 explanation',
    )
    expect(w.find('[data-testid="quiz-progress"]').exists()).toBe(true)
    w.unmount()
  })

  it('does not start a paper with fewer than 5 valid questions', async () => {
    bank.current = { questions: real.questions.slice(0, 4), errors: [] }
    const w = await mountQuiz()
    expect(w.find('[data-testid="quiz-data-error"]').text()).toContain('有效題目只有 4 題')
    expect(w.find('[data-testid="quiz-progress"]').exists()).toBe(false)
    w.unmount()
  })
})

describe('QuizQuestion (TASK-011)', () => {
  const mountQ = (question: Question, response: (number | null)[], submitted = false) =>
    mount(QuizQuestion, { props: { question, response, submitted } })

  // State never by colour alone (README): ✓ / ✗ and words mark key and wrong pick.
  it('marks the key and a wrong pick with symbols and words after submitting', () => {
    const q = byType('single_choice') as Extract<Question, { type: 'single_choice' }>
    const wrong = (q.answer + 1) % q.options.length
    const w = mountQ(q, [wrong], true)
    const opt = (i: number) => w.find(`[data-testid="quiz-option"][data-index="${i}"]`).text()
    expect(opt(q.answer)).toMatch(/^✓.*（正確答案）/)
    expect(opt(wrong)).toMatch(/^✗.*（你的答案）/)
  })

  it('emits the chosen option, and clears it when tapped again', async () => {
    const q = byType('true_false')
    const w = mountQ(q, [null])
    await w.find('[data-testid="quiz-option"][data-index="1"]').trigger('click')
    expect(w.emitted('choose')![0]).toEqual([0, 1])
    await w.setProps({ response: [1] })
    await w.find('[data-testid="quiz-option"][data-index="1"]').trigger('click')
    expect(w.emitted('choose')![1]).toEqual([0, null])
  })

  it('ignores taps after submitting', async () => {
    const w = mountQ(byType('true_false'), [0], true)
    await w.find('[data-testid="quiz-option"][data-index="1"]').trigger('click')
    expect(w.emitted('choose')).toBeUndefined()
  })

  // Matching: one labelled select per left item; ordering: one per position.
  it.each(['matching', 'ordering'] as const)('renders %s as labelled selects', async (t) => {
    const q = byType(t)
    const n = q.type === 'matching' ? q.options.left.length : q.options.length
    const w = mountQ(q, Array(n).fill(null))
    const selects = w.findAll('[data-testid="quiz-select"]')
    expect(selects).toHaveLength(n)
    expect(w.find(`label[for="${selects[0]!.attributes('id')}"]`).exists()).toBe(true)
    await selects[0]!.setValue('2')
    expect(w.emitted('choose')![0]).toEqual([0, 2])
  })

  it('shows the right item under each wrong row after submitting', () => {
    const q = byType('ordering') as Extract<Question, { type: 'ordering' }>
    const wrong = [...q.answer].reverse()
    const rows = mountQ(q, wrong, true).findAll('[data-testid="quiz-row"]')
    expect(rows[0]!.text()).toContain(`✗ 正確是：${q.options[q.answer[0]!]}`)
  })
})
