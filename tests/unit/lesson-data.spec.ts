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
      .flatMap((k) => (k.images ?? []).map((img) => ({ id: k.id, img })))
      .filter(
        ({ img }) =>
          !existsSync(resolve('public', `.${img.src}`)) ||
          img.alt.trim() === '' ||
          img.caption.trim() === '',
      )
      .map(({ id }) => id)
    expect(broken).toEqual([])
  })

  // spec 5.2 unit C: 以兩張細胞示意圖進行比較 — on one card, side by side (I3, Human decision).
  it('unit C compares the plant and animal diagrams on one card', () => {
    const both = lessons[2]!.knowledgePoints.find((k) => k.id === 'c-both')!
    expect(both.images?.map((img) => img.src)).toEqual([
      '/images/cells/plant-cell.svg',
      '/images/cells/animal-cell.svg',
    ])
  })

  it('point ids are unique', () => {
    const ids = lessons.flatMap((l) => l.knowledgePoints.map((k) => k.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  // Misconception guards (TASK-006 review B1, B2; wording confirmed by Human).
  const point = (id: string) => lessons.flatMap((l) => l.knowledgePoints).find((k) => k.id === id)!

  it('does not say digestion itself releases energy (消化 ≠ 呼吸作用)', () => {
    const m = point('a-metabolism')
    expect(m.example).toContain('呼吸作用')
    expect(m.example).not.toMatch(/食物被分解，釋放/)
    // The exam tip must not teach the opposite either.
    expect(m.examTip).toContain('不會直接產生')
  })

  it('defines 感應 as the whole phenomenon, not a step between stimulus and response', () => {
    const r = point('a-response')
    const all = [r.definition, r.plain, r.example, r.examTip].join('')
    expect(all).not.toContain('刺激 → 感應 → 反應')
    expect(r.examTip).toContain('稱為感應')
  })

  // Review items adopted by Human (B3, B5, B7).
  it('keeps adopted curriculum wording', () => {
    const text = JSON.stringify(lessons)
    expect(text).not.toContain('ATP') // not in 國中 108 curriculum
    expect(point('c-plant').example).toContain('沒有葉綠體') // onion epidermis
    expect(point('b-wall').examTip).toContain('真菌、細菌也有細胞壁')
  })

  // Explorer mission targets must point at real unit B structures.
  it('explorer targets are existing knowledge points', () => {
    const ids = new Set(lessons.flatMap((l) => l.knowledgePoints.map((k) => k.id)))
    const targets = getLessonData('bio-01')!.explorer.targets
    expect(targets).toEqual(['b-nucleus', 'b-mitochondrion', 'b-membrane'])
    expect(targets.every((t) => ids.has(t))).toBe(true)
  })
  // TASK-008 / spec.txt 5.3 遊戲二: 細胞核、粒線體、葉綠體、細胞膜 matched to their functions.
  describe('matching game', () => {
    const pairs = getLessonData('bio-01')!.matching.pairs

    it('uses the four spec structures', () => {
      expect(pairs.map((p) => point(p.pointId)?.term.zh)).toEqual([
        '細胞核',
        '粒線體',
        '葉綠體',
        '細胞膜',
      ])
    })

    // A function that names any structure, or two identical functions, gives the answer away.
    it('functions are distinct and never name a structure', () => {
      const names = lessons[1]!.knowledgePoints.map((k) => k.term.zh)
      const fns = pairs.map((p) => p.function)
      expect(new Set(fns).size).toBe(fns.length)
      expect(fns.filter((f) => names.some((n) => f.includes(n)))).toEqual([])
    })

    it('every pair has a hint', () => {
      expect(pairs.filter((p) => p.function.trim() === '' || p.hint.trim() === '')).toEqual([])
    })
  })

  // TASK-009 / spec.txt 5.3 遊戲三: 植物細胞、動物細胞或兩者皆有.
  describe('classification game', () => {
    const items = getLessonData('bio-01')!.classification.items

    it('covers every unit B structure once', () => {
      const unitB = lessons[1]!.knowledgePoints.map((k) => k.id)
      expect(items.map((it) => it.pointId).sort()).toEqual([...unitB].sort())
    })

    // Biology guard (spec 5.2 unit C): only 細胞壁 and 葉綠體 are plant-only; the rest are shared.
    it('puts each structure in the bucket unit C teaches', () => {
      const byName = Object.fromEntries(items.map((it) => [point(it.pointId).term.zh, it.category]))
      expect(byName).toEqual({
        細胞核: 'both',
        細胞膜: 'both',
        細胞質: 'both',
        粒線體: 'both',
        葉綠體: 'plant',
        液胞: 'both',
        細胞壁: 'plant',
      })
    })

    it('every item has an explanation', () => {
      expect(items.filter((it) => it.explanation.trim() === '')).toEqual([])
    })
  })
})
