import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MemoryGame from '@/components/game/MemoryGame.vue'
import { getLessonData } from '@/data/lessons'

const data = getLessonData('bio-01')!
// MemoryGame needs an icon per card; only unit A currently has them (known-issues.md).
const points = data.lessons.flatMap((l) => l.knowledgePoints).filter((p) => p.icon)

const mountGame = () => mount(MemoryGame, { props: { points }, attachTo: document.body })
type W = ReturnType<typeof mountGame>

const card = (w: W, pointId: string, kind: 'icon' | 'term') =>
  w.find(`[data-testid="memory-card"][data-pair-id="${pointId}"][data-kind="${kind}"]`)
const progress = (w: W) => w.find('[data-testid="memory-progress"]').text()
const feedback = (w: W) => w.find('[data-testid="memory-feedback"]').text()

/** Flips every pair correctly, in point order. */
async function matchAll(w: W) {
  for (const p of points) {
    await card(w, p.id, 'icon').trigger('click')
    await card(w, p.id, 'term').trigger('click')
  }
}

describe('MemoryGame', () => {
  it('starts with every card face down', () => {
    const w = mountGame()
    expect(w.findAll('[data-testid="memory-card"]')).toHaveLength(points.length * 2)
    for (const p of points) {
      expect(card(w, p.id, 'icon').attributes('aria-pressed')).toBe('false')
      expect(card(w, p.id, 'term').attributes('aria-pressed')).toBe('false')
    }
    expect(progress(w)).toContain(`0 / ${points.length}`)
  })

  it('flipping a matching pair locks both cards face up and advances progress', async () => {
    const w = mountGame()
    const [p] = points
    await card(w, p!.id, 'icon').trigger('click')
    await card(w, p!.id, 'term').trigger('click')
    expect(card(w, p!.id, 'icon').attributes('aria-pressed')).toBe('true')
    expect(card(w, p!.id, 'term').attributes('aria-pressed')).toBe('true')
    expect(card(w, p!.id, 'icon').attributes('aria-disabled')).toBe('true')
    expect(progress(w)).toContain(`1 / ${points.length}`)
  })

  // No timer: the mismatched pair stays visible, with a reason, until the student dismisses it.
  it('a mismatched pair stays face up with feedback until 繼續 is pressed', async () => {
    const w = mountGame()
    const [a, b] = points
    await card(w, a!.id, 'icon').trigger('click')
    await card(w, b!.id, 'term').trigger('click')
    expect(feedback(w)).toContain('不是一對')
    expect(card(w, a!.id, 'icon').attributes('aria-pressed')).toBe('true')
    expect(card(w, b!.id, 'term').attributes('aria-pressed')).toBe('true')
    expect(progress(w)).toContain(`0 / ${points.length}`)

    // A third card can't be picked while the mismatch is still showing.
    await card(w, points[2]!.id, 'icon').trigger('click')
    expect(card(w, points[2]!.id, 'icon').attributes('aria-pressed')).toBe('false')

    await w.find('[data-testid="memory-dismiss"]').trigger('click')
    expect(feedback(w)).toBe('')
    expect(card(w, a!.id, 'icon').attributes('aria-pressed')).toBe('false')
    expect(card(w, b!.id, 'term').attributes('aria-pressed')).toBe('false')
  })

  it('a matched pair cannot be re-picked or counted twice', async () => {
    const w = mountGame()
    const [p] = points
    await card(w, p!.id, 'icon').trigger('click')
    await card(w, p!.id, 'term').trigger('click')
    await card(w, p!.id, 'icon').trigger('click')
    await card(w, points[1]!.id, 'term').trigger('click')
    expect(progress(w)).toContain(`1 / ${points.length}`)
  })

  it('shows the result with the mistake count once every pair is matched', async () => {
    const w = mountGame()
    await card(w, points[0]!.id, 'icon').trigger('click')
    await card(w, points[1]!.id, 'term').trigger('click')
    await w.find('[data-testid="memory-dismiss"]').trigger('click')
    expect(w.find('[data-testid="memory-result"]').exists()).toBe(false)

    await matchAll(w)
    const result = w.find('[data-testid="memory-result"]')
    expect(result.exists()).toBe(true)
    expect(w.find('[data-testid="memory-summary"]').text()).toContain('翻錯 1 次')
    for (const p of points) expect(result.text()).toContain(p.term.zh)
    await new Promise((r) => setTimeout(r))
    expect(document.activeElement?.id).toBe('memory-result-title')
    w.unmount()
  })

  it('says so when there were no mistakes', async () => {
    const w = mountGame()
    await matchAll(w)
    expect(w.find('[data-testid="memory-summary"]').text()).toContain('一次都沒有翻錯')
    w.unmount()
  })

  it('emits finished once, when the last pair is matched', async () => {
    const w = mountGame()
    for (const p of points.slice(0, -1)) {
      await card(w, p.id, 'icon').trigger('click')
      await card(w, p.id, 'term').trigger('click')
    }
    expect(w.emitted('finished')).toBeUndefined()
    const last = points[points.length - 1]!
    await card(w, last.id, 'icon').trigger('click')
    await card(w, last.id, 'term').trigger('click')
    expect(w.emitted('finished')).toHaveLength(1)
    w.unmount()
  })

  // Phase 3 review S-01 parity: replay without a page reload.
  it('重新挑戰 resets the board for another round', async () => {
    const w = mountGame()
    await matchAll(w)
    expect(w.emitted('finished')).toHaveLength(1)
    await w.find('[data-testid="memory-retry"]').trigger('click')
    expect(w.find('[data-testid="memory-result"]').exists()).toBe(false)
    expect(progress(w)).toContain(`0 / ${points.length}`)
    for (const p of points) {
      expect(card(w, p.id, 'icon').attributes('aria-pressed')).toBe('false')
    }
    await new Promise((r) => setTimeout(r))
    expect(document.activeElement?.id).toBe('memory-title')
    await matchAll(w)
    expect(w.emitted('finished')).toHaveLength(2)
    w.unmount()
  })

  // The deck is shuffled, not dealt as icon-then-name per point in order (that would make
  // the "memory" part trivial: the matching card is always right next to the one just flipped).
  it('does not deal the deck in unshuffled point order', () => {
    const groupedByPoint = points.flatMap((p) => [p.id, p.id])
    for (let n = 0; n < 20; n++) {
      const w = mountGame()
      const deckOrder = w
        .findAll('[data-testid="memory-card"]')
        .map((c) => c.attributes('data-pair-id'))
      if (deckOrder.join() !== groupedByPoint.join()) return
    }
    expect.fail('deck was dealt in the unshuffled point order across 20 tries')
  })
})
