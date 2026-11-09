import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '@/router'
import { useProgressStore } from '@/stores/progress'
import { STORAGE_KEY, emptyProgress, parseProgress, writeStorage } from '@/utils/progressStorage'
import HomeView from '@/views/HomeView.vue'

const at = new Date('2026-11-09T10:00:00Z')
const record = {
  courseId: 'bio-01',
  score: 80,
  passed: true,
  completedAt: at.toISOString(),
  exp: 20,
}
const cp = { courseId: 'bio-01', completed: true, bestScore: 80, latestScore: 80 }
const wrong = {
  questionId: 'bio-01-q03',
  courseId: 'bio-01',
  lastWrongAt: at.toISOString(),
  mastered: false,
}
const valid = {
  version: 1,
  exp: 50,
  records: [record],
  courseProgress: { 'bio-01': cp },
  wrongQuestions: { 'bio-01-q03': wrong },
  badges: ['first-clear'],
  claimed: ['unit:bio-01:lesson-01'],
}

/** A fresh Pinia = what a page reload or a reopened browser sees. */
function reload() {
  setActivePinia(createPinia())
  return useProgressStore()
}

describe('parseProgress (TASK-013: JSON 資料格式錯誤時可安全初始化)', () => {
  it('reads valid saved progress back unchanged', () => {
    expect(parseProgress(JSON.stringify(valid))).toEqual(valid)
  })

  it.each([
    ['nothing saved', null],
    ['broken JSON', '{"version":1,'],
    ['not an object', '[1,2]'],
    ['another version', JSON.stringify({ ...valid, version: 2 })],
  ])('starts empty for %s', (_, text) => {
    expect(parseProgress(text)).toEqual(emptyProgress())
  })

  // One damaged entry must not cost the student everything else (TASK-003 review I2).
  it('drops only the damaged entries', () => {
    const text = JSON.stringify({
      ...valid,
      exp: -5,
      records: [record, { ...record, score: 'x' }, { ...record, completedAt: 'yesterday' }],
      courseProgress: { 'bio-01': cp, 'bio-02': { ...cp, courseId: 'bio-09' } },
      wrongQuestions: { 'bio-01-q03': wrong, 'bio-01-q04': { ...wrong, mastered: 'no' } },
      badges: ['first-clear', 'first-clear', 3],
    })
    expect(parseProgress(text)).toEqual({ ...valid, exp: 0 })
  })
})

describe('progress store persistence (TASK-013)', () => {
  // Spec: 重新整理頁面後資料仍存在；關閉瀏覽器後重新進入仍能讀取資料.
  it('keeps a finished quiz, EXP and wrong questions across a reload', async () => {
    reload().recordQuizResult('bio-01', 80, ['bio-01-q03'], at)
    await nextTick()
    const after = reload()
    expect(after.exp).toBe(50)
    expect(after.courseProgress['bio-01']).toEqual(cp)
    expect(after.records).toEqual([record])
    expect(after.wrongQuestions).toEqual({ 'bio-01-q03': wrong })
  })

  it('starts as a first-time student when the saved data is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, 'not json')
    const p = reload()
    expect([p.exp, p.records, p.courseProgress]).toEqual([0, [], {}])
  })

  // A new mistake puts a question marked 熟悉 back on the list (TASK-014 relies on this).
  it('a repeated mistake updates the entry instead of adding a second one', () => {
    const p = reload()
    p.recordQuizResult('bio-01', 80, ['bio-01-q03'], at)
    p.wrongQuestions['bio-01-q03']!.mastered = true
    const later = new Date('2026-11-10T10:00:00Z')
    p.recordQuizResult('bio-01', 80, ['bio-01-q03'], later)
    expect(p.wrongQuestions).toEqual({
      'bio-01-q03': { ...wrong, lastWrongAt: later.toISOString(), mastered: false },
    })
  })

  // Review I3: 標記已熟悉 is a nested change; it must be saved like any other.
  it('keeps 已熟悉 across a reload', async () => {
    const p = reload()
    p.recordQuizResult('bio-01', 80, ['bio-01-q03'], at)
    await nextTick()
    p.wrongQuestions['bio-01-q03']!.mastered = true
    await nextTick()
    expect(reload().wrongQuestions['bio-01-q03']!.mastered).toBe(true)
  })

  // Review I1: a reset or a newer result saved in another tab must not be overwritten here.
  it('adopts what another tab saved', async () => {
    const p = reload()
    p.recordQuizResult('bio-01', 80, [], at)
    await nextTick()
    // The other tab reset: storage now holds empty progress and the browser tells us.
    const text = JSON.stringify(emptyProgress())
    localStorage.setItem(STORAGE_KEY, text)
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: text }))
    expect(p.exp).toBe(0)
    p.recordQuizResult('bio-01', 60, [], at)
    await nextTick()
    expect(reload().exp).toBe(10)
  })

  it('reset clears memory and storage', async () => {
    const p = reload()
    p.recordQuizResult('bio-01', 80, ['bio-01-q03'], at)
    await nextTick()
    p.resetAll()
    await nextTick()
    expect([p.exp, p.records, p.courseProgress, p.wrongQuestions]).toEqual([0, [], {}, {}])
    // Storage itself holds nothing from before (review S4).
    expect(parseProgress(localStorage.getItem(STORAGE_KEY))).toEqual(emptyProgress())
    expect(reload().exp).toBe(0)
  })

  // Private mode / full quota: the session keeps working, nothing throws.
  it('survives a LocalStorage that throws', async () => {
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    try {
      const p = reload()
      p.recordQuizResult('bio-01', 80, [], at)
      await nextTick()
      expect(p.exp).toBe(50)
      expect(writeStorage(emptyProgress())).toBe(false)
    } finally {
      // Restore even on failure, or later tests would inherit a throwing storage (review S2).
      set.mockRestore()
      get.mockRestore()
    }
  })
})

describe('HomeView reset (TASK-013: 提供重設學習資料功能，並要求使用者確認)', () => {
  async function mountHome() {
    const p = reload()
    p.recordQuizResult('bio-01', 80, [], at)
    const router = createAppRouter(createMemoryHistory())
    await router.push('/')
    const w = mount(HomeView, { global: { plugins: [router] }, attachTo: document.body })
    await flushPromises()
    return { w, p }
  }

  it('asks first; cancelling keeps everything', async () => {
    const { w, p } = await mountHome()
    await w.find('[data-testid="reset-data"]').trigger('click')
    expect(w.find('[data-testid="reset-confirm"]').text()).toContain('無法復原')
    expect(p.exp).toBe(50)
    expect(document.activeElement?.getAttribute('data-testid')).toBe('reset-cancel')
    // Review I2: the focused panel names the question and what is erased, for screen readers.
    const panel = w.find('[data-testid="reset-confirm"]')
    expect(panel.attributes('aria-labelledby')).toBe('reset-confirm-title')
    expect(w.find('#reset-confirm-detail').text()).toContain('無法復原')
    await w.find('[data-testid="reset-cancel"]').trigger('click')
    expect(w.find('[data-testid="reset-confirm"]').exists()).toBe(false)
    expect(p.exp).toBe(50)
    w.unmount()
  })

  it('Escape cancels', async () => {
    const { w, p } = await mountHome()
    await w.find('[data-testid="reset-data"]').trigger('click')
    await w.find('[data-testid="reset-confirm"]').trigger('keydown', { key: 'Escape' })
    expect(w.find('[data-testid="reset-confirm"]').exists()).toBe(false)
    expect(p.exp).toBe(50)
    w.unmount()
  })

  it('confirming wipes the progress and says so', async () => {
    const { w, p } = await mountHome()
    await w.find('[data-testid="reset-data"]').trigger('click')
    await w.find('[data-testid="reset-yes"]').trigger('click')
    expect(p.exp).toBe(0)
    expect(p.records).toEqual([])
    expect(w.find('[data-testid="reset-status"]').text()).toContain('已重設')
    expect(w.find('[data-testid="recent-empty"]').exists()).toBe(true)
    w.unmount()
  })
})
