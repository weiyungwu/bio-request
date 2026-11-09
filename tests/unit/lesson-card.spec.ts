import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import LessonCard from '@/components/lesson/LessonCard.vue'
import { STORY_ADVANCE_COOLDOWN_MS } from '@/components/lesson/storyDialog'
import type { Lesson } from '@/types/lesson'

const kp = (id: string, zh: string, examTip: string) => ({
  id,
  term: { zh, en: zh.toUpperCase() },
  definition: `${zh}定義`,
  plain: `${zh}白話`,
  example: `${zh}例子`,
  examTip,
})

const lessons: Lesson[] = [
  {
    id: 'A',
    title: '單元一',
    knowledgePoints: [kp('a1', '甲', '重點甲'), kp('a2', '乙', '重點乙')],
  },
  { id: 'B', title: '單元二', knowledgePoints: [kp('b1', '丙', '重點丙')] },
]

const btn = (w: ReturnType<typeof mount>, id: string) => w.find(`[data-testid="${id}"]`)
const term = (w: ReturnType<typeof mount>) => w.find('[data-testid="term-zh"]').text()

describe('LessonCard', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // 重點整理 is a required step (spec 3.1 / 頁面三). The same button turns into
  // 下一步, so a double tap / held Enter must not skip straight past it.
  it('ignores 下一步 right after the summary appears', async () => {
    const w = mount(LessonCard, { props: { lessons } })
    for (let i = 0; i < 3; i++) await btn(w, 'lesson-next').trigger('click')
    await btn(w, 'lesson-done').trigger('click')
    expect(w.emitted('complete')).toBeUndefined()
    expect(w.find('[data-testid="lesson-summary"]').exists()).toBe(true)
    vi.advanceTimersByTime(STORY_ADVANCE_COOLDOWN_MS)
    await btn(w, 'lesson-done').trigger('click')
    expect(w.emitted('complete')).toHaveLength(1)
  })

  it('starts at the first point of the first unit, with progress', () => {
    const w = mount(LessonCard, { props: { lessons } })
    expect(term(w)).toBe('甲')
    expect(w.find('[data-testid="lesson-position"]').text()).toContain('單元一')
    expect(w.find('[data-testid="lesson-position"]').text()).toContain('1 / 3')
    expect(btn(w, 'lesson-prev').attributes('disabled')).toBeDefined()
  })

  // TASK-006: 可切換下一個知識點, including across unit boundaries, and back.
  it('moves to the next point across units and back', async () => {
    const w = mount(LessonCard, { props: { lessons } })
    await btn(w, 'lesson-next').trigger('click')
    expect(term(w)).toBe('乙')
    await btn(w, 'lesson-next').trigger('click')
    expect(term(w)).toBe('丙')
    expect(w.find('[data-testid="lesson-position"]').text()).toContain('單元二')
    await btn(w, 'lesson-prev').trigger('click')
    expect(term(w)).toBe('乙')
  })

  // spec 3.1 / 頁面三: 重點整理 after the knowledge points, then 下一步.
  it('ends with a summary of every exam tip, then emits complete once', async () => {
    const w = mount(LessonCard, { props: { lessons } })
    for (let i = 0; i < 3; i++) await btn(w, 'lesson-next').trigger('click')
    const summary = w.find('[data-testid="lesson-summary"]')
    expect(summary.exists()).toBe(true)
    for (const tip of ['重點甲', '重點乙', '重點丙']) expect(summary.text()).toContain(tip)
    expect(w.emitted('complete')).toBeUndefined()
    vi.advanceTimersByTime(STORY_ADVANCE_COOLDOWN_MS)
    await btn(w, 'lesson-done').trigger('click')
    await btn(w, 'lesson-done').trigger('click')
    expect(w.emitted('complete')).toHaveLength(1)
  })

  it('can go back from the summary to the last point', async () => {
    const w = mount(LessonCard, { props: { lessons } })
    for (let i = 0; i < 3; i++) await btn(w, 'lesson-next').trigger('click')
    await btn(w, 'lesson-prev').trigger('click')
    expect(term(w)).toBe('丙')
  })

  // Focus stays on the button the student is pressing; screen readers hear the
  // new term via the live region instead (I2).
  it('announces the new term when the point changes', async () => {
    const w = mount(LessonCard, { props: { lessons } })
    await btn(w, 'lesson-next').trigger('click')
    expect(w.find('[data-testid="lesson-position"]').text()).toContain('乙')
    expect(w.find('[data-testid="lesson-position"]').attributes('aria-live')).toBe('polite')
  })

  // I1: entering the summary must not drop keyboard focus to <body>.
  it('keeps focus on the forward button when entering the summary', async () => {
    const w = mount(LessonCard, { props: { lessons }, attachTo: document.body })
    const forward = btn(w, 'lesson-next').element as HTMLElement
    forward.focus()
    for (let i = 0; i < 3; i++) await btn(w, 'lesson-next').trigger('click')
    await nextTick()
    expect(btn(w, 'lesson-done').element).toBe(forward)
    expect(document.activeElement).toBe(forward)
    w.unmount()
  })

  // I1: 上一個 becomes disabled on point 1; move focus to 下一個 instead of losing it.
  it('moves focus to the next button when going back to the first point', async () => {
    const w = mount(LessonCard, { props: { lessons }, attachTo: document.body })
    await btn(w, 'lesson-next').trigger('click')
    ;(btn(w, 'lesson-prev').element as HTMLElement).focus()
    await btn(w, 'lesson-prev').trigger('click')
    await nextTick()
    expect(document.activeElement).toBe(btn(w, 'lesson-next').element)
    w.unmount()
  })

  it('keeps terms unbroken in the summary too', async () => {
    const w = mount(LessonCard, { props: { lessons } })
    for (let i = 0; i < 3; i++) await btn(w, 'lesson-next').trigger('click')
    const terms = w.findAll('[data-testid="summary-term"]')
    expect(terms.map((t) => t.text())).toEqual(['甲', '乙', '丙'])
    expect(terms.every((t) => t.classes().includes('whitespace-nowrap'))).toBe(true)
  })
})
