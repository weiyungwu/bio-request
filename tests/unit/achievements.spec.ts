import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import ClassificationGame from '@/components/game/ClassificationGame.vue'
import LessonCard from '@/components/lesson/LessonCard.vue'
import { getLessonData } from '@/data/lessons'
import { createAppRouter } from '@/router'
import { useProgressStore } from '@/stores/progress'
import type { CourseProgress } from '@/types/progress'
import { BADGES, earnedBadgeIds, localDay } from '@/utils/achievements'
import HomeView from '@/views/HomeView.vue'

function reload() {
  setActivePinia(createPinia())
  return useProgressStore()
}
const cleared = (...ids: string[]): Record<string, CourseProgress> =>
  Object.fromEntries(
    ids.map((id) => [id, { courseId: id, completed: true, bestScore: 80, latestScore: 80 }]),
  )
const rec = (score: number) => ({
  courseId: 'bio-01',
  score,
  passed: score >= 80,
  completedAt: '2026-11-10T02:00:00Z',
})

describe('badge conditions (spec FR-07)', () => {
  it.each([
    ['first-clear', cleared('bio-01'), []],
    // Human decision: 細胞相關關卡 = stages 1 and 2.
    ['cell-expert', cleared('bio-01', 'bio-02'), []],
    ['quiz-ace', {}, [rec(90)]],
    ['perfect-clear', {}, [rec(100)]],
    ['bio-master', cleared(...Array.from({ length: 8 }, (_, i) => `bio-0${i + 1}`)), []],
  ])('%s is earned when its condition is met', (id, cp, records) => {
    expect(earnedBadgeIds(cp, records)).toContain(id)
  })

  it('stage 1 alone is not 細胞專家; 80 points is not 答題高手', () => {
    const ids = earnedBadgeIds(cleared('bio-01'), [rec(80)])
    expect(ids).toEqual(['first-clear'])
  })
})

describe('rewards in the progress store (TASK-015)', () => {
  // Spec: 不會重複發放同一徽章.
  it('never gives the same badge twice', () => {
    const p = reload()
    expect(
      p.recordQuizResult('bio-01', 100, [], new Date('2026-11-10T02:00:00Z')).newBadges,
    ).toEqual(['first-clear', 'quiz-ace', 'perfect-clear'])
    expect(
      p.recordQuizResult('bio-01', 100, [], new Date('2026-11-11T02:00:00Z')).newBadges,
    ).toEqual([])
    expect(p.badges).toEqual(['first-clear', 'quiz-ace', 'perfect-clear'])
  })

  // Review I1: a save from before badges existed gets what it already earned, on load —
  // not later as a "new" badge on an unrelated attempt.
  it('awards badges an older save already meets when it loads', () => {
    localStorage.setItem(
      'bio-quest:progress',
      JSON.stringify({
        version: 1,
        exp: 50,
        records: [rec(80)],
        courseProgress: cleared('bio-01'),
        wrongQuestions: {},
        badges: [],
      }),
    )
    const p = reload()
    expect(p.badges).toEqual(['first-clear'])
    expect(p.recordQuizResult('bio-01', 60, [], new Date(2026, 10, 12, 9)).newBadges).toEqual([])
  })

  // Review S4: records saved before `exp` existed count as 0 toward today's cap.
  it('counts an older record without exp as 0 toward the cap', () => {
    const p = reload()
    p.records.push({ ...rec(100), completedAt: new Date(2026, 10, 10, 8).toISOString() })
    expect(p.recordQuizResult('bio-01', 100, [], new Date(2026, 10, 10, 9)).quiz).toBe(40)
  })

  // Spec: 成就狀態重新載入後仍存在 — badges and claimed first-time rewards.
  it('keeps badges and claimed rewards across a reload', async () => {
    const p = reload()
    p.recordQuizResult('bio-01', 100, [], new Date('2026-11-10T02:00:00Z'))
    p.claim('unit:bio-01:lesson-01', 10)
    await nextTick()
    const after = reload()
    expect(after.badges).toEqual(['first-clear', 'quiz-ace', 'perfect-clear'])
    expect(after.claim('unit:bio-01:lesson-01', 10)).toBe(0)
  })

  // §2 每單元／每遊戲首次: a first-time reward is paid once.
  it('pays a first-time reward once', () => {
    const p = reload()
    expect(p.claim('game:bio-01:matching', 15)).toBe(15)
    expect(p.claim('game:bio-01:matching', 15)).toBe(0)
    expect(p.exp).toBe(15)
  })

  // §3: 每日測驗 EXP 上限 100; the remainder only; first-time rewards are not capped.
  it('caps quiz EXP at 100 per local day, then resets the next day', () => {
    const p = reload()
    const day1 = (h: number) => new Date(2026, 10, 10, h)
    const paid = [8, 9, 10].map((h) => p.recordQuizResult('bio-01', 100, [], day1(h)))
    expect(paid.map((a) => [a.quiz, a.capped])).toEqual([
      [40, false],
      [40, false],
      [20, true],
    ])
    const capped = p.recordQuizResult('bio-01', 100, [], day1(11))
    expect([capped.quiz, capped.capped, capped.total]).toEqual([0, true, 0])
    expect(p.recordQuizResult('bio-01', 100, [], new Date(2026, 10, 11, 0, 5)).quiz).toBe(40)
    // 30 first clear + 100 capped quiz on day 1 + 40 on day 2.
    expect(p.exp).toBe(170)
  })

  it('counts days on the device clock, not UTC', () => {
    expect(localDay(new Date(2026, 10, 10, 23, 59))).not.toBe(
      localDay(new Date(2026, 10, 11, 0, 1)),
    )
    expect(localDay(new Date(2026, 10, 10, 0, 1))).toBe(localDay(new Date(2026, 10, 10, 23, 59)))
  })

  // Human decision: 完成錯題補強 = every wrong question of the stage re-answered right, once.
  it('pays 錯題補強 once, when the whole stage is re-answered right', () => {
    const p = reload()
    p.recordQuizResult('bio-01', 60, ['bio-01-q01', 'bio-01-q02'], new Date('2026-11-10T02:00:00Z'))
    const later = new Date('2026-11-10T03:00:00Z')
    expect(p.recordReviewAnswer('bio-01-q01', true, later)).toBe(0)
    // 標記已熟悉 without a correct retry doesn't complete it (§3 重新答對才給).
    p.setMastered('bio-01-q02', true)
    expect(p.recordReviewAnswer('bio-01-q01', true, later)).toBe(0)
    expect(p.recordReviewAnswer('bio-01-q02', true, later)).toBe(10)
    expect(p.recordReviewAnswer('bio-01-q02', true, later)).toBe(0)
  })
})

describe('reward events and badge display', () => {
  const data = getLessonData('bio-01')!

  // 完成一個知識單元: fired when reading moves past a unit's last point.
  it('LessonCard reports each finished unit', async () => {
    const w = mount(LessonCard, { props: { lessons: data.lessons } })
    const total = data.lessons.reduce((n, l) => n + l.knowledgePoints.length, 0)
    for (let n = 0; n < total; n++) await w.find('[data-testid="lesson-next"]').trigger('click')
    expect(w.emitted('unit-complete')).toEqual(data.lessons.map((l) => [l.id]))
  })

  it('ClassificationGame reports reaching its result', async () => {
    const points = data.lessons.flatMap((l) => l.knowledgePoints)
    const items = data.classification.items
    const w = mount(ClassificationGame, { props: { items, points } })
    for (let n = 0; n < items.length; n++) {
      await w.find('[data-testid="classification-choice"]').trigger('click')
      await w.find('[data-testid="classification-next"]').trigger('click')
    }
    expect(w.emitted('complete')).toHaveLength(1)
  })

  // Earned and locked badges differ by icon and words, not colour alone.
  it('home lists every badge as 已取得 or 未取得', async () => {
    const p = reload()
    p.recordQuizResult('bio-01', 80, [], new Date('2026-11-10T02:00:00Z'))
    const router = createAppRouter(createMemoryHistory())
    await router.push('/')
    const w = mount(HomeView, { global: { plugins: [router] } })
    await flushPromises()
    const badges = w.findAll('[data-testid="badge"]')
    expect(badges).toHaveLength(BADGES.length)
    expect(badges[0]!.text()).toContain('✓ 已取得')
    expect(badges[1]!.text()).toContain('未取得')
    expect(badges.filter((b) => b.attributes('data-earned') === 'true')).toHaveLength(1)
  })
})
