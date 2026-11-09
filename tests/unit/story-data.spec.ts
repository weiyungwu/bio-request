import { describe, it, expect } from 'vitest'
import { getLessonData } from '@/data/lessons'

// Content integrity: a typo in a speaker id would render a nameless line.
describe('bio-01 story data', () => {
  const story = getLessonData('bio-01')!.story

  it('has lines, and every line has a defined speaker and text', () => {
    const ids = new Set(story.characters.map((c) => c.id))
    expect(story.lines.length).toBeGreaterThan(0)
    for (const line of story.lines) {
      expect(ids.has(line.speaker)).toBe(true)
      expect(line.text.trim()).not.toBe('')
    }
  })

  // spec.txt 5.1 task name and FR-02 mission objectives.
  it('uses the spec mission title and objectives', () => {
    expect(story.title).toBe('細胞城市大搜查')
    expect(story.objectives).toEqual([
      '找到細胞核。',
      '找到粒線體。',
      '找到細胞膜。',
      '分辨植物細胞與動物細胞。',
    ])
  })

  it('returns undefined for a course without lesson data', () => {
    expect(getLessonData('bio-02')).toBeUndefined()
  })
})
