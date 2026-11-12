import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import StoryDialog from '@/components/lesson/StoryDialog.vue'
import {
  STORY_ADVANCE_COOLDOWN_MS,
  STORY_TYPE_MS,
  storyLineMs,
} from '@/components/lesson/storyDialog'
import type { Story } from '@/types/lesson'

const story: Story = {
  title: '測試任務',
  characters: [
    { id: 'a', name: '隊長', avatar: 'A' },
    { id: 'b', name: '助手', avatar: 'B' },
  ],
  lines: [
    { speaker: 'a', text: '第一句' },
    { speaker: 'b', text: '第二句' },
    { speaker: 'a', text: '第三句' },
  ],
  objectives: ['目標一', '目標二'],
}

const next = (w: ReturnType<typeof mount>) => w.find('[data-testid="story-next"]').trigger('click')
const wait = () => vi.advanceTimersByTime(STORY_ADVANCE_COOLDOWN_MS)

describe('StoryDialog', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // Human request (2026-11-12): skip straight to 探險者訓練 (story and mission card).
  it('略過故事 completes the story at once', async () => {
    const w = mount(StoryDialog, { props: { story } })
    wait()
    await next(w)
    // Right after 下一段 (inside its cooldown) a skip still works.
    await w.find('[data-testid="story-skip"]').trigger('click')
    expect(w.emitted('complete')).toHaveLength(1)
    await w.find('[data-testid="story-skip"]').trigger('click')
    expect(w.emitted('complete')).toHaveLength(1)
  })

  // The double tap that opened the stage must not skip the whole story.
  it('ignores 略過故事 during the opening cooldown', async () => {
    const w = mount(StoryDialog, { props: { story } })
    await w.find('[data-testid="story-skip"]').trigger('click')
    expect(w.emitted('complete')).toBeUndefined()
  })

  // TASK-005: 對話能依序顯示
  it('shows lines in order with the speaker name', async () => {
    const w = mount(StoryDialog, { props: { story } })
    expect(w.find('[data-testid="story-line"]').text()).toContain('隊長')
    expect(w.find('[data-testid="story-line"]').text()).toContain('第一句')
    wait()
    await next(w)
    expect(w.find('[data-testid="story-line"]').text()).toContain('助手')
    expect(w.find('[data-testid="story-line"]').text()).toContain('第二句')
    expect(w.text()).toContain('2 / 3')
  })

  // A double tap on the stage card in the map must not also skip line 1.
  it('ignores a click right after the dialog appears', async () => {
    const w = mount(StoryDialog, { props: { story } })
    await next(w)
    expect(w.find('[data-testid="story-line"]').text()).toContain('第一句')
  })

  // Screen readers must hear who is speaking on every line, even when the
  // speaker doesn't change (only the text node would change otherwise).
  it('announces speaker and text together', () => {
    const line = mount(StoryDialog, { props: { story } }).find('[data-testid="story-line"]')
    expect(line.attributes('aria-live')).toBe('polite')
    expect(line.attributes('aria-atomic')).toBe('true')
  })

  // Keyboard / screen-reader users: the mission card replaces the dialog, so
  // focus must move into it (to its heading, so the title is read first).
  it('moves focus to the mission heading when the mission card appears', async () => {
    const w = mount(StoryDialog, { props: { story }, attachTo: document.body })
    for (let i = 0; i < story.lines.length; i++) {
      wait()
      await next(w)
    }
    await nextTick()
    expect(document.activeElement).toBe(w.find('[data-testid="mission-card"] h2').element)
    w.unmount()
  })

  // TASK-005: 不會因快速點擊而跳過必要流程
  it('ignores rapid clicks so no line is skipped', async () => {
    const w = mount(StoryDialog, { props: { story } })
    wait()
    await next(w)
    await next(w)
    await next(w)
    expect(w.find('[data-testid="story-line"]').text()).toContain('第二句')
  })

  it('shows the mission card after the last line, not before', async () => {
    const w = mount(StoryDialog, { props: { story } })
    for (let i = 0; i < story.lines.length - 1; i++) {
      expect(w.find('[data-testid="mission-card"]').exists()).toBe(false)
      wait()
      await next(w)
    }
    expect(w.find('[data-testid="mission-card"]').exists()).toBe(false)
    wait()
    await next(w)
    const card = w.find('[data-testid="mission-card"]')
    expect(card.text()).toContain('測試任務')
    expect(card.text()).toContain('目標一')
    expect(card.text()).toContain('目標二')
  })

  // TASK-005: 最後一段可進入教學 — exactly once, even on a double click.
  it('emits complete once from the mission card', async () => {
    const w = mount(StoryDialog, { props: { story } })
    for (let i = 0; i < story.lines.length; i++) {
      wait()
      await next(w)
    }
    expect(w.emitted('complete')).toBeUndefined()
    wait()
    const start = w.find('[data-testid="mission-start"]')
    await start.trigger('click')
    await start.trigger('click')
    expect(w.emitted('complete')).toHaveLength(1)
  })

  // A fast double click on the last line must not also hit 開始訓練.
  it('applies the cooldown to the mission start button too', async () => {
    const w = mount(StoryDialog, { props: { story } })
    for (let i = 0; i < story.lines.length; i++) {
      wait()
      await next(w)
    }
    await w.find('[data-testid="mission-start"]').trigger('click')
    expect(w.emitted('complete')).toBeUndefined()
  })
})

// Human request (2026-11-13): lines type out like a character talking.
describe('StoryDialog typing', () => {
  const long: Story = {
    ...story,
    lines: [
      { speaker: 'a', text: '探險隊員，緊急任務！總部收到一則神秘訊息，請立刻出發調查。' },
      { speaker: 'b', text: '收到！' },
    ],
  }
  const typed = (w: ReturnType<typeof mount>) => w.find('[data-testid="story-typed"]').text()
  let blips: number
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    blips = 0
    // Counts generated blips without real audio (jsdom has none).
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'running'
        currentTime = 0
        destination = {}
        createOscillator() {
          return {
            frequency: {},
            connect: (g: unknown) => g,
            start: () => blips++,
            stop() {},
          }
        }
        createGain() {
          return {
            gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
            connect: (d: unknown) => d,
          }
        }
        close() {}
      },
    )
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('types the line out one character at a time, then shows ▼', async () => {
    const w = mount(StoryDialog, { props: { story: long } })
    expect(typed(w)).toBe('')
    vi.advanceTimersByTime(STORY_TYPE_MS * 2)
    await nextTick()
    expect(typed(w)).toBe('探險')
    expect(w.find('[data-testid="story-more"]').exists()).toBe(false)
    vi.advanceTimersByTime(storyLineMs(long.lines[0]!.text))
    await nextTick()
    expect(typed(w)).toBe(long.lines[0]!.text)
    expect(w.find('[data-testid="story-more"]').exists()).toBe(true)
  })

  // Screen readers must not hear the line letter by letter.
  it('gives screen readers the whole line at once, and hides the typing bubble', () => {
    const w = mount(StoryDialog, { props: { story: long } })
    expect(w.find('[data-testid="story-line"]').text()).toContain(long.lines[0]!.text)
    expect(w.find('[data-testid="story-typed"]').element.closest('[aria-hidden="true"]')).not.toBe(
      null,
    )
  })

  // A quick reader is not held back, but one press never both finishes and skips a line.
  it('下一段 while typing shows the whole line first, without moving on', async () => {
    const w = mount(StoryDialog, { props: { story: long } })
    wait()
    await next(w)
    expect(typed(w)).toBe(long.lines[0]!.text)
    expect(w.text()).toContain('1 / 2')
    await next(w)
    expect(w.text()).toContain('1 / 2')
    wait()
    await next(w)
    expect(w.text()).toContain('2 / 2')
  })

  it('shows the whole line at once when the device asks for reduced motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }))
    const w = mount(StoryDialog, { props: { story: long } })
    expect(typed(w)).toBe(long.lines[0]!.text)
  })

  // Human decision: sound is off by default (classrooms); the student's choice is remembered.
  it('makes no sound unless the student turns it on, and remembers the choice', async () => {
    const w = mount(StoryDialog, { props: { story: long } })
    const toggle = w.find('[data-testid="story-sound"]')
    expect(toggle.attributes('aria-pressed')).toBe('false')
    vi.advanceTimersByTime(storyLineMs(long.lines[0]!.text))
    expect(blips).toBe(0)

    await toggle.trigger('click')
    expect(toggle.attributes('aria-pressed')).toBe('true')
    w.unmount()
    const again = mount(StoryDialog, { props: { story: long } })
    expect(again.find('[data-testid="story-sound"]').attributes('aria-pressed')).toBe('true')
    const before = blips
    vi.advanceTimersByTime(storyLineMs(long.lines[0]!.text))
    expect(blips).toBeGreaterThan(before)
  })
})
