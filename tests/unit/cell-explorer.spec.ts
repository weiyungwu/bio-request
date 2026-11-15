import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CellExplorer from '@/components/lesson/CellExplorer.vue'
import { getLessonData } from '@/data/lessons'

const data = getLessonData('bio-01')!
const points = data.lessons.flatMap((l) => l.knowledgePoints)
const targets = data.explorer.targets

const mountExplorer = () => mount(CellExplorer, { props: { points, targets } })
type W = ReturnType<typeof mountExplorer>

const structureIds = (w: W) =>
  w.findAll('[data-testid="structure-chip"]').map((c) => c.attributes('data-structure'))
const tapShape = (w: W, id: string) => w.find(`svg [data-structure="${id}"]`).trigger('click')
const tapChip = (w: W, id: string) =>
  w.find(`[data-testid="structure-chip"][data-structure="${id}"]`).trigger('click')
const info = (w: W) => w.find('[data-testid="structure-info"]')
const showCell = (w: W, kind: 'plant' | 'animal') =>
  w.find(`[data-testid="cell-${kind}"]`).trigger('click')

const EXPECTED: Record<string, string> = {
  wall: '細胞壁',
  membrane: '細胞膜',
  cytoplasm: '細胞質',
  nucleus: '細胞核',
  chloroplast: '葉綠體',
  vacuole: '液胞',
  mitochondrion: '粒線體',
}

describe('CellExplorer', () => {
  it('shows the plant cell first, with all 7 structures', () => {
    expect(structureIds(mountExplorer()).sort()).toEqual(Object.keys(EXPECTED).sort())
  })

  // Animal cells have no cell wall or chloroplast — the diagram must not offer them.
  it('switches to the animal cell, which has no wall or chloroplast', async () => {
    const w = mountExplorer()
    await showCell(w, 'animal')
    expect(structureIds(w).sort()).toEqual([
      'cytoplasm',
      'membrane',
      'mitochondrion',
      'nucleus',
      'vacuole',
    ])
    expect(w.find('svg [data-structure="wall"]').exists()).toBe(false)
    expect(w.find('svg [data-structure="chloroplast"]').exists()).toBe(false)
  })

  // TASK-007: 點擊指定構造能顯示正確說明 — every shape, both cells.
  it.each(['plant', 'animal'] as const)(
    'tapping each %s structure shows its own name and function',
    async (kind) => {
      const w = mountExplorer()
      await showCell(w, kind)
      for (const id of structureIds(w)) {
        await tapShape(w, id!)
        const point = points.find((p) => p.term.zh === EXPECTED[id!])!
        expect(info(w).text()).toContain(point.term.zh)
        expect(info(w).text()).toContain(point.definition)
      }
    },
  )

  // Small shapes (mitochondria) are hard to hit on a phone; chips are the reliable control.
  it('announces the selection to screen readers', () => {
    expect(info(mountExplorer()).attributes('aria-live')).toBe('polite')
  })

  // The disabled 下一步 must say why, also to screen readers.
  it('links the hint to the disabled 下一步 button', () => {
    const w = mountExplorer()
    const hintId = w.find('[data-testid="explore-hint"]').attributes('id')
    expect(hintId).toBeTruthy()
    expect(w.find('[data-testid="explore-done"]').attributes('aria-describedby')).toBe(hintId)
  })

  // Students must see WHERE the selected structure is. Cytoplasm is a filled
  // region whose outline is covered by the membrane, so it is highlighted by fill.
  it('highlights the selected structure on the diagram', async () => {
    const w = mountExplorer()
    await tapShape(w, 'nucleus')
    expect(w.find('svg [data-structure="nucleus"]').classes()).toContain('is-selected')
    await tapShape(w, 'cytoplasm')
    expect(w.find('svg [data-structure="cytoplasm"]').classes()).toContain('is-selected-fill')
    expect(w.find('svg [data-structure="nucleus"]').classes()).not.toContain('is-selected')
  })

  // Review TASK-007 複審 S-a: the mitochondrion's crease lines must not turn white (nearly
  // invisible against the orange fill) when the .is-selected 4px white outline is applied —
  // they need their own stroke colour, not just their own stroke-width.
  it.each(['plant', 'animal'] as const)(
    '%s mitochondrion folds keep their own colour, independent of .is-selected',
    async (kind) => {
      const w = mountExplorer()
      await showCell(w, kind)
      await tapShape(w, 'mitochondrion')
      const folds = w.find('svg [data-structure="mitochondrion"]').findAll('.fold')
      expect(folds.length).toBeGreaterThan(0)
      for (const fold of folds) {
        expect(fold.attributes('stroke')).toBe('#7c2d12')
      }
    },
  )

  // Review TASK-007 複審 S-b: a tap just outside the membrane line must not silently fall
  // through to the wall (plant) or do nothing (animal, no wall to fall through to).
  it('widens the plant membrane hit area past its own line, and removes the animal clip entirely', async () => {
    const w = mountExplorer()
    const plantClipRect = w.find('svg clipPath rect')
    expect(plantClipRect.attributes()).toMatchObject({
      x: '46.5',
      y: '36.5',
      width: '227',
      height: '167',
    })
    // The membrane's own visible line is unchanged (x 48, width 224) — only the clip grew.
    const visibleMembraneLine = w.findAll('svg [stroke="#2dd4bf"]')[0]!
    expect(visibleMembraneLine.attributes('x')).toBe('48')
    expect(visibleMembraneLine.attributes('width')).toBe('224')

    await showCell(w, 'animal')
    expect(w.find('svg clipPath').exists()).toBe(false)
    const animalMembraneHit = w.find('svg [data-structure="membrane"] .hit-area')
    expect(animalMembraneHit.attributes('clip-path')).toBeUndefined()
  })

  it('chips select the same structure as the shapes', async () => {
    const w = mountExplorer()
    await tapChip(w, 'mitochondrion')
    expect(info(w).text()).toContain('粒線體')
    expect(
      w
        .find('[data-testid="structure-chip"][data-structure="mitochondrion"]')
        .attributes('aria-pressed'),
    ).toBe('true')
  })

  // TASK-007: 不依賴圖片中的文字 — the drawing has no text; meaning lives in the info panel.
  it('has no text inside the diagram and hides it from screen readers', async () => {
    const w = mountExplorer()
    for (const kind of ['plant', 'animal'] as const) {
      await showCell(w, kind)
      expect(w.find('svg').findAll('text').length).toBe(0)
      expect(w.find('svg').attributes('aria-hidden')).toBe('true')
    }
  })

  it('counts explored structures once each, and 重新探索 resets', async () => {
    const w = mountExplorer()
    await tapShape(w, 'nucleus')
    await tapShape(w, 'nucleus')
    await tapShape(w, 'vacuole')
    expect(w.find('[data-testid="explore-progress"]').text()).toContain('2 / 7')
    await w.find('[data-testid="explore-reset"]').trigger('click')
    expect(w.find('[data-testid="explore-progress"]').text()).toContain('0 / 7')
    expect(info(w).text()).toContain('點選')
  })

  // FR-02: 完成任務後才能進入下一階段 — the story's mission objectives gate 下一步.
  // FR-02 objective 分辨植物細胞與動物細胞: find what the animal cell lacks
  // (wall, chloroplast) in the plant cell, and look at the animal cell.
  it('unlocks 下一步 only after the mission targets are found and the cells are told apart', async () => {
    const w = mountExplorer()
    const next = () => w.find('[data-testid="explore-done"]')
    for (const id of ['nucleus', 'mitochondrion', 'membrane']) await tapShape(w, id)
    await showCell(w, 'animal')
    await tapShape(w, 'cytoplasm')
    expect(next().attributes('disabled')).toBeDefined()
    expect(w.find('[data-testid="explore-hint"]').text()).toContain('細胞壁')
    await showCell(w, 'plant')
    await tapShape(w, 'wall')
    expect(next().attributes('disabled')).toBeDefined()
    await tapShape(w, 'chloroplast')
    expect(next().attributes('disabled')).toBeUndefined()
    await next().trigger('click')
    await next().trigger('click')
    expect(w.emitted('complete')).toHaveLength(1)
  })

  it('shows mission checklist items as done with ✓ text, not color only', async () => {
    const w = mountExplorer()
    await tapShape(w, 'nucleus')
    const items = w.findAll('[data-testid="mission-item"]').map((i) => i.text())
    expect(items.find((t) => t.includes('細胞核'))).toContain('✓')
    expect(items.find((t) => t.includes('粒線體'))).not.toContain('✓')
  })
})
