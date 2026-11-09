import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProgressStore } from '@/stores/progress'

describe('progress store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  // TASK-003: "學習資料不存在時顯示預設狀態" — the store's empty state is that default.
  it('starts empty for a first-time student', () => {
    const store = useProgressStore()
    expect(store.exp).toBe(0)
    expect(store.records).toEqual([])
    expect(store.latestRecords).toEqual([])
    expect(store.levelInfo.level).toBe(1)
  })

  // Home lists "最近學習紀錄": most recent first, capped so the page stays short.
  it('returns the latest 3 records, newest first', () => {
    const store = useProgressStore()
    store.records = [
      { courseId: 'bio-01', score: 60, passed: false, completedAt: '2026-11-01T10:00:00Z' },
      { courseId: 'bio-01', score: 100, passed: true, completedAt: '2026-11-04T10:00:00Z' },
      { courseId: 'bio-01', score: 80, passed: true, completedAt: '2026-11-03T10:00:00Z' },
      { courseId: 'bio-01', score: 70, passed: false, completedAt: '2026-11-02T10:00:00Z' },
    ]
    expect(store.latestRecords.map((r) => r.score)).toEqual([100, 80, 70])
  })

  // Order by actual time, not string: 23:30Z is later than 01:00+08:00 (= 17:00Z).
  it('sorts by real time across timezone offsets', () => {
    const store = useProgressStore()
    store.records = [
      { courseId: 'bio-01', score: 1, passed: false, completedAt: '2026-11-09T01:00:00+08:00' },
      { courseId: 'bio-01', score: 2, passed: false, completedAt: '2026-11-08T23:30:00Z' },
    ]
    expect(store.latestRecords.map((r) => r.score)).toEqual([2, 1])
  })

  // One corrupted record must not break the home page; drop it from the list.
  it('skips records whose completedAt is not a valid date', () => {
    const store = useProgressStore()
    store.records = [
      { courseId: 'bio-01', score: 1, passed: false, completedAt: 'garbage' },
      { courseId: 'bio-01', score: 2, passed: true, completedAt: '2026-11-08T10:00:00Z' },
    ]
    expect(store.latestRecords.map((r) => r.score)).toEqual([2])
  })
})
