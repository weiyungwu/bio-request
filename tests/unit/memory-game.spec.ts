import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import MemoryGame from '@/components/game/MemoryGame.vue'
import { MEMORY_PREVIEW_MS } from '@/components/game/memoryGame'
import { getLessonData } from '@/data/lessons'

const data = getLessonData('bio-01')!
// Mirrors LessonView's memoryPoints: unit A only, not every icon-bearing point in the lesson
// (known-issues.md — some unit B/C/D points also have an icon, but MemoryGame is scoped to
// unit A on purpose, so the test data must match that scope, not just "has an icon").
const points = data.lessons[0]!.knowledgePoints.filter((p) => p.icon)

const mountGame = () => mount(MemoryGame, { props: { points }, attachTo: document.body })
type W = ReturnType<typeof mountGame>

const card = (w: W, pointId: string, kind: 'icon' | 'term') =>
  w.find(`[data-testid="memory-card"][data-pair-id="${pointId}"][data-kind="${kind}"]`)
const progress = (w: W) => w.find('[data-testid="memory-progress"]').text()
const feedback = (w: W) => w.find('[data-testid="memory-feedback"]').text()
/** Human request (2026-11-15): the deck previews face up for a moment before play starts. */
const skipPreview = () => vi.advanceTimersByTime(MEMORY_PREVIEW_MS)

/** Skips the preview, then flips every pair correctly, in point order. */
async function matchAll(w: W) {
  skipPreview()
  for (const p of points) {
    await card(w, p.id, 'icon').trigger('click')
    await card(w, p.id, 'term').trigger('click')
  }
}

describe('MemoryGame', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('previews the whole deck face up, then flips every card face down', async () => {
    const w = mountGame()
    expect(w.findAll('[data-testid="memory-card"]')).toHaveLength(points.length * 2)
    expect(w.find('[data-testid="memory-preview-notice"]').exists()).toBe(true)
    for (const p of points) {
      const icon = card(w, p.id, 'icon')
      expect(icon.attributes('aria-pressed')).toBe('true')
      expect(icon.attributes('aria-disabled')).toBe('true')
      expect(icon.text()).toBe(p.icon)
    }
    // Clicking during the preview does nothing.
    await card(w, points[0]!.id, 'icon').trigger('click')
    expect(progress(w)).toContain(`0 / ${points.length}`)

    skipPreview()
    await nextTick()
    expect(w.find('[data-testid="memory-preview-notice"]').exists()).toBe(false)
    for (const p of points) {
      expect(card(w, p.id, 'icon').attributes('aria-pressed')).toBe('false')
      expect(card(w, p.id, 'term').attributes('aria-pressed')).toBe('false')
    }
    expect(progress(w)).toContain(`0 / ${points.length}`)
  })

  it('flipping a matching pair locks both cards face up and advances progress', async () => {
    const w = mountGame()
    skipPreview()
    const [p] = points
    await card(w, p!.id, 'icon').trigger('click')
    await card(w, p!.id, 'term').trigger('click')
    expect(card(w, p!.id, 'icon').attributes('aria-pressed')).toBe('true')
    expect(card(w, p!.id, 'term').attributes('aria-pressed')).toBe('true')
    expect(card(w, p!.id, 'icon').attributes('aria-disabled')).toBe('true')
    expect(progress(w)).toContain(`1 / ${points.length}`)
  })

  // Review finding: "matched" and "selected, waiting for a second pick" are both plain
  // face-up text — the only thing distinguishing them must not be colour alone, so check the
  // marker, the aria-label wording and the border classes, not just aria-pressed.
  it('marks selected, matched and mismatched cards differently, not by colour alone', async () => {
    const w = mountGame()
    skipPreview()
    const [a, b] = points
    const first = card(w, a!.id, 'icon')
    await first.trigger('click')
    expect(first.attributes('aria-pressed')).toBe('true')
    expect(first.attributes('aria-disabled')).toBe('false')
    expect(first.text()).toContain('▶')
    expect(first.attributes('aria-label')).toContain(a!.icon)
    expect(first.attributes('aria-label')).not.toContain('已配對')
    expect(first.attributes('aria-label')).not.toContain('不是一對')
    expect(first.classes().join(' ')).toContain('border-reward')
    expect(progress(w)).toContain(`0 / ${points.length}`)

    // Completing the pair turns the same card into "matched": a different marker, label and
    // border, not just a different fill of the same look.
    await card(w, a!.id, 'term').trigger('click')
    expect(first.text()).toContain('✓')
    expect(first.attributes('aria-label')).toContain('已配對')
    expect(first.classes().join(' ')).toContain('border-success')

    // A mismatch gets its own marker/label/border too.
    await card(w, b!.id, 'icon').trigger('click')
    const mismatched = card(w, b!.id, 'icon')
    await card(w, points[2]!.id, 'term').trigger('click')
    expect(mismatched.text()).toContain('✗')
    expect(mismatched.attributes('aria-label')).toContain('不是一對')
    expect(mismatched.classes().join(' ')).toContain('border-danger')

    // Face down cards carry none of the above.
    const untouched = card(w, points[3]!.id, 'icon')
    expect(untouched.text()).not.toMatch(/[✓✗▶]/)
    expect(untouched.classes().join(' ')).toContain('border-border')
  })

  // No timer: the mismatched pair stays visible, with a reason, until the student dismisses it.
  it('a mismatched pair stays face up with feedback until 繼續 is pressed', async () => {
    const w = mountGame()
    skipPreview()
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
    // Review finding: 繼續 removes itself from the DOM; keyboard/screen-reader focus must not
    // fall back to <body>.
    expect(document.activeElement?.id).toBe('memory-title')
    w.unmount()
  })

  it('a matched pair cannot be re-picked or counted twice', async () => {
    const w = mountGame()
    skipPreview()
    const [p] = points
    await card(w, p!.id, 'icon').trigger('click')
    await card(w, p!.id, 'term').trigger('click')
    await card(w, p!.id, 'icon').trigger('click')
    await card(w, points[1]!.id, 'term').trigger('click')
    expect(progress(w)).toContain(`1 / ${points.length}`)
  })

  it('shows the result with the mistake count once every pair is matched', async () => {
    const w = mountGame()
    skipPreview()
    await card(w, points[0]!.id, 'icon').trigger('click')
    await card(w, points[1]!.id, 'term').trigger('click')
    await w.find('[data-testid="memory-dismiss"]').trigger('click')
    expect(w.find('[data-testid="memory-result"]').exists()).toBe(false)

    for (const p of points) {
      await card(w, p.id, 'icon').trigger('click')
      await card(w, p.id, 'term').trigger('click')
    }
    const result = w.find('[data-testid="memory-result"]')
    expect(result.exists()).toBe(true)
    expect(w.find('[data-testid="memory-summary"]').text()).toContain('翻錯 1 次')
    for (const p of points) expect(result.text()).toContain(p.term.zh)
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
    skipPreview()
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
  it('重新挑戰 resets the board, including a fresh preview, for another round', async () => {
    const w = mountGame()
    await matchAll(w)
    expect(w.emitted('finished')).toHaveLength(1)
    await w.find('[data-testid="memory-retry"]').trigger('click')
    expect(w.find('[data-testid="memory-result"]').exists()).toBe(false)
    expect(progress(w)).toContain(`0 / ${points.length}`)
    // 重新挑戰 previews the new round too, not just resets straight to face down.
    expect(w.find('[data-testid="memory-preview-notice"]').exists()).toBe(true)
    for (const p of points) {
      expect(card(w, p.id, 'icon').attributes('aria-pressed')).toBe('true')
    }
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
