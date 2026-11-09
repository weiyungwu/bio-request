import { describe, it, expect } from 'vitest'
import courses from '@/data/courses.json'
import { OPEN_COURSE_IDS, stageStatus } from '@/utils/stages'

// TASK-004: 初版只有第一關開放. Stages without built content must stay locked,
// otherwise students enter an empty stage.
describe('stageStatus', () => {
  it('opens only stage 1 for a first-time student', () => {
    const statuses = courses.map((c) => stageStatus(c.id, {}))
    expect(statuses).toEqual([
      'open',
      'locked',
      'locked',
      'locked',
      'locked',
      'locked',
      'locked',
      'locked',
    ])
    expect(OPEN_COURSE_IDS).toEqual(['bio-01'])
  })

  it('marks an open stage completed once its progress says so', () => {
    expect(
      stageStatus('bio-01', {
        'bio-01': { courseId: 'bio-01', completed: true, bestScore: 90, latestScore: 90 },
      }),
    ).toBe('completed')
  })

  it('keeps an open stage open when attempted but not completed', () => {
    expect(
      stageStatus('bio-01', {
        'bio-01': { courseId: 'bio-01', completed: false, bestScore: 60, latestScore: 60 },
      }),
    ).toBe('open')
  })

  // Stale or tampered storage must not unlock a stage that has no content.
  it('keeps a locked stage locked even if stored progress claims completion', () => {
    expect(
      stageStatus('bio-02', {
        'bio-02': { courseId: 'bio-02', completed: true, bestScore: 100, latestScore: 100 },
      }),
    ).toBe('locked')
  })
})
