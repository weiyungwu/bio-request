import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MatchingGame from '@/components/game/MatchingGame.vue'
import { getLessonData } from '@/data/lessons'

const data = getLessonData('bio-01')!
const points = data.lessons.flatMap((l) => l.knowledgePoints)
const pairs = data.matching.pairs

const mountGame = () => mount(MatchingGame, { props: { pairs, points }, attachTo: document.body })
type W = ReturnType<typeof mountGame>

const structure = (w: W, id: string) => w.find(`[data-testid="match-structure"][data-id="${id}"]`)
const fn = (w: W, id: string) => w.find(`[data-testid="match-function"][data-id="${id}"]`)
const pair = async (w: W, s: string, f: string) => {
  await structure(w, s).trigger('click')
  await fn(w, f).trigger('click')
}
const feedback = (w: W) => w.find('[data-testid="matching-feedback"]').text()
const progress = (w: W) => w.find('[data-testid="matching-progress"]').text()

describe('MatchingGame (TASK-008)', () => {
  // Spec: 正確時給予正向回饋; FR-04: explain why, not just 對/錯.
  it('a correct pair gives positive feedback with the explanation and locks the pair', async () => {
    const w = mountGame()
    await pair(w, 'b-nucleus', 'b-nucleus')
    expect(feedback(w)).toContain('答對了')
    const nucleus = points.find((p) => p.id === 'b-nucleus')!
    expect(feedback(w)).toContain(nucleus.definition)
    expect(feedback(w)).toContain(nucleus.plain)
    expect(structure(w, 'b-nucleus').attributes('aria-disabled')).toBe('true')
    expect(fn(w, 'b-nucleus').text()).toContain('→ 細胞核')
    expect(progress(w)).toContain('1 / 4')
  })

  // Spec: 錯誤時顯示提示 — the hint must be about the structure the student picked.
  it('a wrong pair shows a hint and matches nothing', async () => {
    const w = mountGame()
    await pair(w, 'b-mitochondrion', 'b-membrane')
    const text = feedback(w)
    expect(text).toContain('再想想')
    expect(text).toContain('粒線體的功能不是「控制物質進出細胞」')
    expect(text).toContain(pairs.find((p) => p.pointId === 'b-mitochondrion')!.hint)
    expect(progress(w)).toContain('0 / 4')
    // Selection resets so the next try starts clean.
    expect(w.findAll('[aria-pressed="true"]')).toHaveLength(0)
  })

  it('picking the function first works too', async () => {
    const w = mountGame()
    await fn(w, 'b-chloroplast').trigger('click')
    await structure(w, 'b-chloroplast').trigger('click')
    expect(progress(w)).toContain('1 / 4')
  })

  // Spec: 不會重複計算已完成配對.
  it('re-picking a finished pair never counts it again', async () => {
    const w = mountGame()
    await pair(w, 'b-nucleus', 'b-nucleus')
    await pair(w, 'b-nucleus', 'b-nucleus')
    await structure(w, 'b-nucleus').trigger('click')
    expect(progress(w)).toContain('1 / 4')
    // A finished item can't be selected and then used in a wrong pair either.
    expect(structure(w, 'b-nucleus').attributes('aria-pressed')).toBe('false')
    await fn(w, 'b-membrane').trigger('click')
    expect(feedback(w)).toContain('答對了')
  })

  // Spec: 全部完成後顯示結果, including how many mistakes were made on the way.
  it('shows the result with every pair and the mistake count once all are matched', async () => {
    const w = mountGame()
    await pair(w, 'b-membrane', 'b-nucleus')
    expect(w.find('[data-testid="matching-result"]').exists()).toBe(false)
    for (const p of pairs) await pair(w, p.pointId, p.pointId)
    const result = w.find('[data-testid="matching-result"]')
    expect(result.exists()).toBe(true)
    expect(w.find('[data-testid="matching-summary"]').text()).toContain('4 組全部配對成功')
    expect(w.find('[data-testid="matching-summary"]').text()).toContain('配錯 1 次')
    for (const p of pairs) expect(result.text()).toContain(p.function)
    await new Promise((r) => setTimeout(r))
    expect(document.activeElement?.id).toBe('matching-result-title')
    w.unmount()
  })

  it('says so when there were no mistakes', async () => {
    const w = mountGame()
    for (const p of pairs) await pair(w, p.pointId, p.pointId)
    expect(w.find('[data-testid="matching-summary"]').text()).toContain('一次都沒有配錯')
    w.unmount()
  })

  // State is shown with text/icons, not colour alone (README design rule).
  it('marks finished items with ✓, unfinished with their number or letter', async () => {
    const w = mountGame()
    await pair(w, 'b-nucleus', 'b-nucleus')
    expect(structure(w, 'b-nucleus').text()).toMatch(/^✓/)
    expect(structure(w, 'b-membrane').text()).toMatch(/^\d\./)
    expect(fn(w, 'b-membrane').text()).toMatch(/^[A-D]\./)
  })
  // Colour-blind students need a non-colour cue for the item waiting for its partner.
  it('marks the selected item with ▶', async () => {
    const w = mountGame()
    await structure(w, 'b-membrane').trigger('click')
    expect(structure(w, 'b-membrane').text()).toMatch(/^▶/)
    expect(structure(w, 'b-membrane').attributes('aria-pressed')).toBe('true')
  })

  it('tapping the selected item again deselects it', async () => {
    const w = mountGame()
    await fn(w, 'b-membrane').trigger('click')
    await fn(w, 'b-membrane').trigger('click')
    expect(fn(w, 'b-membrane').attributes('aria-pressed')).toBe('false')
  })

  // Changing your mind within one column is not a mistake.
  it('picking another structure only moves the selection', async () => {
    const w = mountGame()
    await structure(w, 'b-nucleus').trigger('click')
    await structure(w, 'b-membrane').trigger('click')
    expect(feedback(w)).toBe('')
    await fn(w, 'b-membrane').trigger('click')
    expect(feedback(w)).toContain('答對了')
  })

  // The same wrong pair twice must be announced twice (fresh live-region node).
  it('re-renders feedback for a repeated wrong pair', async () => {
    const w = mountGame()
    await pair(w, 'b-nucleus', 'b-membrane')
    const first = w.find('[data-testid="matching-feedback"] > div').element
    await pair(w, 'b-nucleus', 'b-membrane')
    expect(w.find('[data-testid="matching-feedback"] > div').element).not.toBe(first)
  })

  it('does not list functions in the structure order', () => {
    const ids = (w: W, col: string) =>
      w.findAll(`[data-testid="match-${col}"]`).map((b) => b.attributes('data-id'))
    for (let n = 0; n < 20; n++) {
      const w = mountGame()
      expect(ids(w, 'function')).not.toEqual(ids(w, 'structure'))
      w.unmount()
    }
  })
})
