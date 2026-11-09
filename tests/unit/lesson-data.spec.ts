import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { getLessonData } from '@/data/lessons'

// TASK-006: 教學內容可以從 JSON 載入, covering spec.txt 5.2 units A, B, C.
describe('bio-01 lessons', () => {
  const lessons = getLessonData('bio-01')!.lessons
  const terms = (i: number) => lessons[i]!.knowledgePoints.map((k) => k.term.zh)

  it('has units A, B, C with spec titles', () => {
    expect(lessons.map((l) => l.title)).toEqual([
      '生命的特徵',
      '細胞基本構造',
      '植物細胞與動物細胞',
    ])
  })

  it('unit A covers the six characteristics of life in spec order', () => {
    expect(terms(0)).toEqual(['生長與發育', '代謝作用', '感應與反應', '繁殖', '遺傳', '適應'])
  })

  it('unit B covers the seven structures in spec order', () => {
    expect(terms(1)).toEqual(['細胞核', '細胞膜', '細胞質', '粒線體', '葉綠體', '液胞', '細胞壁'])
  })

  // FR-03 required fields: a blank field shows an empty box to students.
  it('every knowledge point has all FR-03 text fields filled', () => {
    const blank = lessons
      .flatMap((l) => l.knowledgePoints)
      .filter((k) =>
        [k.term.zh, k.term.en, k.definition, k.plain, k.example, k.examTip].some(
          (field) => field.trim() === '',
        ),
      )
      .map((k) => k.id)
    expect(blank).toEqual([])
  })

  // A broken image path would show a broken-image icon instead of the diagram.
  it('every image exists in public/ and has alt text and a caption', () => {
    const broken = lessons
      .flatMap((l) => l.knowledgePoints)
      .filter(
        (k) =>
          k.image &&
          (!existsSync(resolve('public', `.${k.image.src}`)) ||
            k.image.alt.trim() === '' ||
            k.image.caption.trim() === ''),
      )
      .map((k) => k.id)
    expect(broken).toEqual([])
  })

  // spec 5.2 unit C compares two diagrams.
  it('unit C shows both the plant and the animal cell diagram', () => {
    const srcs = lessons[2]!.knowledgePoints.map((k) => k.image?.src)
    expect(srcs).toContain('/images/cells/plant-cell.svg')
    expect(srcs).toContain('/images/cells/animal-cell.svg')
  })

  it('point ids are unique', () => {
    const ids = lessons.flatMap((l) => l.knowledgePoints.map((k) => k.id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
