import { describe, it, expect } from 'vitest'
import { getLessonData } from '@/data/lessons'
import { OPEN_COURSE_IDS } from '@/utils/stages'
import type { LessonData } from '@/types/lesson'

const files = import.meta.glob<{ default: LessonData }>('@/data/lessons/*.json', { eager: true })

// Content integrity for every lesson file, not just bio-01.
describe.each(Object.entries(files))('lesson data %s', (path, { default: data }) => {
  // The loader keys by courseId; a copy-pasted id would silently shadow another stage.
  it('is named after its courseId', () => {
    expect(path.endsWith(`/${data.courseId}.json`)).toBe(true)
  })

  // A typo in a speaker id would render a nameless line.
  it('has lines, and every line has a defined speaker and text', () => {
    const ids = new Set(data.story.characters.map((c) => c.id))
    expect(data.story.lines.length).toBeGreaterThan(0)
    for (const line of data.story.lines) {
      expect(ids.has(line.speaker)).toBe(true)
      expect(line.text.trim()).not.toBe('')
    }
  })
})

describe('lesson data coverage', () => {
  // spec FR-02: 每個關卡都有獨立故事. An open stage without data would skip the story.
  it.each(OPEN_COURSE_IDS)('open stage %s has lesson data', (id) => {
    expect(getLessonData(id)).toBeDefined()
  })

  // spec.txt 5.1 task name and FR-02 mission objectives.
  it('bio-01 uses the spec mission title and objectives', () => {
    const story = getLessonData('bio-01')!.story
    expect(story.title).toBe('細胞城市大搜查')
    expect(story.objectives).toEqual([
      '找到細胞核。',
      '找到粒線體。',
      '找到細胞膜。',
      '分辨植物細胞與動物細胞。',
    ])
  })
})
