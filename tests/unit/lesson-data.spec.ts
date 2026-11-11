import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { getLessonData } from '@/data/lessons'

// TASK-006: 教學內容可以從 JSON 載入, covering spec.txt 5.2 units A, B, C.
describe('bio-01 lessons', () => {
  const lessons = getLessonData('bio-01')!.lessons
  const terms = (i: number) => lessons[i]!.knowledgePoints.map((k) => k.term.zh)

  // Human decision (2026-11-11): stage 1 follows the textbook's cell sections (1-1, 1-3, 1-4).
  // Unit C was 植物細胞與動物細胞; it now also compares prokaryotic and eukaryotic cells.
  it('has units A, B, C, D with the confirmed titles', () => {
    expect(lessons.map((l) => l.title)).toEqual([
      '生命的特徵',
      '細胞基本構造',
      '細胞的種類',
      '細胞膜與物質運輸',
    ])
  })

  // New points go after the spec ones, so existing points keep their place and ids.
  it('unit A covers the six characteristics of life in spec order, then the levels (1-1)', () => {
    expect(terms(0)).toEqual([
      '生長與發育',
      '代謝作用',
      '感應與反應',
      '繁殖',
      '遺傳',
      '適應',
      '生物體的組成層次',
    ])
  })

  it('unit B covers the seven structures in spec order, then the other organelles (1-3)', () => {
    expect(terms(1)).toEqual([
      '細胞核',
      '細胞膜',
      '細胞質',
      '粒線體',
      '葉綠體',
      '液胞',
      '細胞壁',
      '核糖體、內質網與高基氏體',
      '溶體',
    ])
  })

  // 上篇／下篇 (Human decision 2026-11-11): the parts cover every unit once, in order, and
  // 下篇 starts at unit C, after the structures it builds on.
  it('splits the lesson into 上篇 (units A, B) and 下篇 (units C, D)', () => {
    const parts = getLessonData('bio-01')!.parts!
    expect(parts.map((p) => p.name)).toEqual(['上篇', '下篇'])
    expect(parts.flatMap((p) => p.lessonIds)).toEqual(lessons.map((l) => l.id))
    expect(parts[1]!.lessonIds[0]).toBe('lesson-03')
  })

  // Units C and D compare and use unit B's structures, so they must come after it; the lesson's
  // second half (下篇) starts at unit C.
  it('units C and D teach cell types, then transport (1-3, 1-4)', () => {
    expect(terms(2)).toEqual(['植物細胞', '動物細胞', '共同構造', '原核細胞與真核細胞'])
    expect(terms(3)).toEqual(['被動運輸：擴散與滲透', '主動運輸', '胞吞與胞吐'])
  })

  // KnowledgeCard shows the images, or else the icon; a point with neither has an empty picture
  // slot. The textbook points (2026-11-11) have only icons.
  it('every knowledge point has images or an icon', () => {
    const bare = lessons
      .flatMap((l) => l.knowledgePoints)
      .filter((k) => !k.images?.length && !k.icon?.trim())
      .map((k) => k.id)
    expect(bare).toEqual([])
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

    // The seven spec structures. The textbook organelles added later stay out: textbooks
    // differ on whether plant cells have 溶體, so its bucket would be disputed.
    it('covers each of the seven spec structures once', () => {
      const seven = lessons[1]!.knowledgePoints.slice(0, 7).map((k) => k.id)
      expect(items.map((it) => it.pointId).sort()).toEqual([...seven].sort())
    })

    // Biology guard (spec 5.2 unit C): only 細胞壁 and 葉綠體 are plant-only; the rest are shared.
    // 液胞 as both: Human confirmed against 108 課綱 textbooks (翰林、南一、康軒).
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
