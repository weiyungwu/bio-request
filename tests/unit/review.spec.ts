import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '@/router'
import { getQuestionBank } from '@/data/questions'
import { useProgressStore } from '@/stores/progress'
import type { Question } from '@/types/question'
import { parseProgress } from '@/utils/progressStorage'
import ReviewView from '@/views/ReviewView.vue'

const bank = getQuestionBank('bio-01')!.questions
const q = (id: string) => bank.find((x) => x.id === id)!
const t1 = new Date('2026-11-09T10:00:00Z')
const t2 = new Date('2026-11-10T10:00:00Z')

function reload() {
  setActivePinia(createPinia())
  return useProgressStore()
}

describe('progress store: 錯題本 actions (TASK-014)', () => {
  // Spec: 重新答對後能更新狀態.
  it('a correct retry is remembered; a wrong one sends it back to 待複習', () => {
    const p = reload()
    p.recordQuizResult('bio-01', 60, ['bio-01-q01'], t1)
    p.setMastered('bio-01-q01', true)
    p.recordReviewAnswer('bio-01-q01', true, t2)
    expect(p.wrongQuestions['bio-01-q01']).toMatchObject({
      mastered: true,
      lastCorrectAt: t2.toISOString(),
    })
    p.recordReviewAnswer('bio-01-q01', false, t2)
    expect(p.wrongQuestions['bio-01-q01']).toMatchObject({
      mastered: false,
      lastWrongAt: t2.toISOString(),
    })
  })

  it('ignores ids that are not in the 錯題本', () => {
    const p = reload()
    p.recordReviewAnswer('bio-01-q99', true)
    p.setMastered('bio-01-q99', true)
    expect(p.wrongQuestions).toEqual({})
  })

  // Saved entries from before lastCorrectAt existed must still load (TASK-013 review S1).
  it('loads entries with or without lastCorrectAt, and drops a bad one', async () => {
    const p = reload()
    p.recordQuizResult('bio-01', 60, ['bio-01-q01', 'bio-01-q02'], t1)
    p.recordReviewAnswer('bio-01-q01', true, t2)
    await nextTick()
    const saved = parseProgress(localStorage.getItem('bio-quest:progress'))
    expect(saved.wrongQuestions['bio-01-q01']!.lastCorrectAt).toBe(t2.toISOString())
    expect(saved.wrongQuestions['bio-01-q02']!.lastCorrectAt).toBeUndefined()
    const bad = JSON.stringify({
      ...saved,
      wrongQuestions: {
        x: { ...saved.wrongQuestions['bio-01-q02'], questionId: 'x', lastCorrectAt: 'soon' },
      },
    })
    expect(parseProgress(bad).wrongQuestions).toEqual({})
  })
})

describe('ReviewView (TASK-014)', () => {
  async function mountReview() {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/review')
    const w = mount(ReviewView, { global: { plugins: [router] }, attachTo: document.body })
    await flushPromises()
    return w
  }
  const item = (w: Awaited<ReturnType<typeof mountReview>>, id: string) =>
    w.find(`[data-testid="review-item"][data-id="${id}"]`)

  it('says so when there are no wrong questions', async () => {
    reload()
    const w = await mountReview()
    expect(w.find('[data-testid="review-summary"]').text()).toContain('目前沒有錯題')
    expect(w.findAll('[data-testid="review-group"]')).toHaveLength(0)
    w.unmount()
  })

  // Spec: 依關卡分類；不會將不同題目錯誤合併 — two questions, two items, one stage group.
  it('groups by stage and keeps every question separate, 待複習 first', async () => {
    const p = reload()
    p.recordQuizResult('bio-01', 60, ['bio-01-q01'], t1)
    p.recordQuizResult('bio-01', 60, ['bio-01-q05'], t2)
    p.setMastered('bio-01-q05', true)
    const w = await mountReview()
    const groups = w.findAll('[data-testid="review-group"]')
    expect(groups.map((g) => g.attributes('data-course'))).toEqual(['bio-01'])
    expect(w.findAll('[data-testid="review-item"]').map((i) => i.attributes('data-id'))).toEqual([
      'bio-01-q01',
      'bio-01-q05',
    ])
    expect(w.find('[data-testid="review-summary"]').text()).toContain('還有 1 題待複習')
    w.unmount()
  })

  // Fail loud: an entry whose question left the bank is counted, not silently dropped.
  it('counts wrong questions that are no longer in the bank', async () => {
    const p = reload()
    p.recordQuizResult('bio-01', 60, ['bio-01-q01', 'bio-01-q99'], t1)
    const w = await mountReview()
    expect(w.findAll('[data-testid="review-item"]')).toHaveLength(1)
    expect(w.find('[data-testid="review-missing"]').text()).toContain('另有 1 題')
    w.unmount()
  })

  // Spec: 查看正確答案；查看解析.
  it('shows the correct answer and explanation on request', async () => {
    reload().recordQuizResult('bio-01', 60, ['bio-01-q01'], t1)
    const w = await mountReview()
    expect(item(w, 'bio-01-q01').find('[data-testid="review-answer"]').exists()).toBe(false)
    await item(w, 'bio-01-q01').find('[data-testid="review-toggle-answer"]').trigger('click')
    const answer = item(w, 'bio-01-q01').find('[data-testid="review-answer"]').text()
    expect(answer).toContain('感應與反應')
    expect(answer).toContain(q('bio-01-q01').explanation)
    w.unmount()
  })

  // Spec: 重新作答；重新答對後能更新狀態.
  it('a correct retry updates the status; submitting needs an answer first', async () => {
    const p = reload()
    p.recordQuizResult('bio-01', 60, ['bio-01-q01'], t1)
    const w = await mountReview()
    const it = () => item(w, 'bio-01-q01')
    await it().find('[data-testid="review-retry"]').trigger('click')
    expect(it().find('[data-testid="review-submit"]').attributes('disabled')).toBeDefined()
    const key = (q('bio-01-q01') as Extract<Question, { type: 'single_choice' }>).answer
    await it().find(`[data-testid="quiz-option"][data-index="${key}"]`).trigger('click')
    await it().find('[data-testid="review-submit"]').trigger('click')
    expect(it().find('[data-testid="quiz-feedback"]').text()).toContain('答對了')
    expect(p.wrongQuestions['bio-01-q01']!.lastCorrectAt).toBeDefined()
    expect(it().text()).toContain('已重新答對')
    w.unmount()
  })

  // Spec: 標記已熟悉 — and it can be undone.
  it('marks a question as 已熟悉 and back', async () => {
    const p = reload()
    p.recordQuizResult('bio-01', 60, ['bio-01-q01'], t1)
    const w = await mountReview()
    const btn = () => item(w, 'bio-01-q01').find('[data-testid="review-mastered"]')
    await btn().trigger('click')
    expect(p.wrongQuestions['bio-01-q01']!.mastered).toBe(true)
    expect(item(w, 'bio-01-q01').text()).toContain('已熟悉')
    await btn().trigger('click')
    expect(p.wrongQuestions['bio-01-q01']!.mastered).toBe(false)
    w.unmount()
  })

  // Two retries open at once must not share ids (labels, aria references).
  it('keeps ids unique with two retries open', async () => {
    reload().recordQuizResult('bio-01', 60, ['bio-01-q05', 'bio-01-q07'], t1)
    const w = await mountReview()
    for (const b of w.findAll('[data-testid="review-retry"]')) await b.trigger('click')
    const ids = w.findAll('[id]').map((e) => e.attributes('id'))
    expect(new Set(ids).size).toBe(ids.length)
    w.unmount()
  })
})
