import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ClassificationGame from '@/components/game/ClassificationGame.vue'
import { getLessonData } from '@/data/lessons'
import type { CellCategory } from '@/types/lesson'

const data = getLessonData('bio-01')!
const points = data.lessons.flatMap((l) => l.knowledgePoints)
const items = data.classification.items
const itemByName = new Map(
  items.map((it) => [points.find((p) => p.id === it.pointId)!.term.zh, it]),
)

const mountGame = () =>
  mount(ClassificationGame, { props: { items, points }, attachTo: document.body })
type W = ReturnType<typeof mountGame>

const current = (w: W) => itemByName.get(w.find('[data-testid="classification-item"]').text())!
const choice = (w: W, c: CellCategory) =>
  w.find(`[data-testid="classification-choice"][data-category="${c}"]`)
const feedback = (w: W) => w.find('[data-testid="classification-feedback"]').text()
const wrongFor = (c: CellCategory): CellCategory => (c === 'both' ? 'plant' : 'both')
const next = (w: W) => w.find('[data-testid="classification-next"]').trigger('click')

/** Answers every item; `wrong` lists structure ids to answer incorrectly. */
async function playAll(w: W, wrong: string[] = []) {
  for (let n = 0; n < items.length; n++) {
    const it = current(w)
    await choice(w, wrong.includes(it.pointId) ? wrongFor(it.category) : it.category).trigger(
      'click',
    )
    await next(w)
  }
}

/** Answers correctly and moves on until the current structure matches `category`. */
async function skipTo(w: W, category: CellCategory) {
  while (current(w).category !== category) {
    await choice(w, current(w).category).trigger('click')
    await next(w)
  }
}

describe('ClassificationGame (TASK-009)', () => {
  // Spec: 分類正確與否能被判斷; FR-04: the feedback explains why.
  it('a correct answer says so and explains why', async () => {
    const w = mountGame()
    const it = current(w)
    await choice(w, it.category).trigger('click')
    expect(feedback(w)).toContain('答對了')
    expect(feedback(w)).toContain(it.explanation)
    expect(choice(w, it.category).text()).toMatch(/^✓/)
  })

  // A wrong answer must name the right bucket, or the student learns nothing from it.
  it('a wrong answer shows the correct category, the explanation and marks the pick ✗', async () => {
    const w = mountGame()
    const it = current(w)
    const wrong = wrongFor(it.category)
    await choice(w, wrong).trigger('click')
    const text = feedback(w)
    expect(text).toContain('不對喔')
    expect(text).toContain(it.explanation)
    expect(choice(w, wrong).text()).toMatch(/^✗/)
    expect(choice(w, it.category).text()).toMatch(/^✓/)
  })

  // Review I1: "細胞核…不是「動物細胞」" reads as "animal cells have no nucleus" — false.
  it('a wrong pick for a shared structure states both cells have it, never "不是"', async () => {
    const w = mountGame()
    await skipTo(w, 'both')
    const name = w.find('[data-testid="classification-item"]').text()
    await choice(w, 'animal').trigger('click')
    expect(feedback(w)).toContain(`正確答案是「兩者皆有」：植物細胞和動物細胞都有${name}。`)
    expect(feedback(w)).not.toContain('不是')
  })

  it('a plant-only structure says animal cells lack it', async () => {
    const w = mountGame()
    await skipTo(w, 'plant')
    const name = w.find('[data-testid="classification-item"]').text()
    await choice(w, 'plant').trigger('click')
    expect(feedback(w)).toContain(`植物細胞有${name}，動物細胞沒有。`)
  })

  // Review I3: ✓ / ✗ are aria-hidden, so screen readers need the state in words.
  it('names the correct answer and the wrong pick for screen readers', async () => {
    const w = mountGame()
    const it = current(w)
    const wrong = wrongFor(it.category)
    expect(w.findAll('.sr-only').filter((e) => e.text().includes('答案'))).toHaveLength(0)
    await choice(w, wrong).trigger('click')
    expect(choice(w, it.category).find('.sr-only').text()).toBe('（正確答案）')
    expect(choice(w, wrong).find('.sr-only').text()).toBe('（你的答案）')
  })

  // Mounted when the student leaves the matching game; focus must land on the new game.
  it('focuses its title on mount', () => {
    const w = mountGame()
    expect(document.activeElement?.id).toBe('classification-title')
    w.unmount()
  })

  // One answer per structure: tapping again (or fast double taps) can't change or re-score it.
  it('locks the answer once chosen', async () => {
    const w = mountGame()
    const it = current(w)
    await choice(w, wrongFor(it.category)).trigger('click')
    await choice(w, it.category).trigger('click')
    expect(feedback(w)).toContain('不對喔')
    expect(choice(w, it.category).attributes('aria-disabled')).toBe('true')
  })

  // No skipping: "next" only exists after answering, so a structure can't be left blank.
  it('only offers next after an answer', async () => {
    const w = mountGame()
    expect(w.find('[data-testid="classification-next"]').exists()).toBe(false)
    const first = current(w)
    await choice(w, first.category).trigger('click')
    await next(w)
    expect(current(w)).not.toBe(first)
    expect(w.find('[data-testid="classification-progress"]').text()).toContain('2 / 7')
    expect(feedback(w)).toBe('')
  })

  // Spec: 顯示完整解析 — every structure with its answer, the student's wrong pick and why.
  it('shows the score and a full analysis of every structure at the end', async () => {
    const w = mountGame()
    await playAll(w, ['b-mitochondrion'])
    expect(w.find('[data-testid="classification-summary"]').text()).toContain('7 個構造答對 6 個')
    const reviews = w.findAll('[data-testid="classification-review"]')
    expect(reviews).toHaveLength(items.length)
    for (const it of items) {
      const r = w.find(`[data-testid="classification-review"][data-id="${it.pointId}"]`)
      expect(r.text()).toContain(it.explanation)
    }
    const mito = w.find('[data-testid="classification-review"][data-id="b-mitochondrion"]')
    expect(mito.text()).toContain('✗')
    expect(mito.text()).toContain('正確答案：兩者皆有')
    expect(mito.text()).toContain('你的答案：植物細胞')
    await new Promise((r) => setTimeout(r))
    expect(document.activeElement?.id).toBe('classification-result-title')
    w.unmount()
  })

  it('says so when everything is right', async () => {
    const w = mountGame()
    await playAll(w)
    expect(w.find('[data-testid="classification-summary"]').text()).toContain('全部正確')
    w.unmount()
  })

  // Spec: 可重新挑戰 — a fresh round with no answers carried over.
  it('retry starts a new round from the first structure', async () => {
    const w = mountGame()
    await playAll(w, ['b-wall', 'b-nucleus'])
    await w.find('[data-testid="classification-retry"]').trigger('click')
    expect(w.find('[data-testid="classification-result"]').exists()).toBe(false)
    expect(w.find('[data-testid="classification-progress"]').text()).toContain('1 / 7')
    expect(choice(w, 'plant').attributes('aria-disabled')).toBe('false')
    await playAll(w)
    expect(w.find('[data-testid="classification-summary"]').text()).toContain('答對 7 個')
    w.unmount()
  })
})
