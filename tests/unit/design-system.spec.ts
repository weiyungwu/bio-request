import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '@/components/common/BaseButton.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import BaseTag from '@/components/common/BaseTag.vue'
import BaseCard from '@/components/common/BaseCard.vue'

describe('BaseButton', () => {
  // Quiz "未作答不可提交" (TASK-011) relies on a disabled button swallowing
  // clicks (via the native disabled attribute); if it ever emits, students
  // can submit blank answers.
  it('does not emit click while disabled', async () => {
    const wrapper = mount(BaseButton, { props: { disabled: true }, slots: { default: '提交' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('emits click when enabled', async () => {
    const wrapper = mount(BaseButton, { slots: { default: '開始冒險' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  // A button inside a future form must not submit it by accident.
  it('defaults to type="button"', () => {
    const wrapper = mount(BaseButton, { slots: { default: 'x' } })
    expect(wrapper.attributes('type')).toBe('button')
  })

  it('applies a distinct style per variant', () => {
    const variants = ['primary', 'secondary', 'reward', 'ghost'] as const
    const classes = variants.map((variant) =>
      mount(BaseButton, { props: { variant }, slots: { default: 'x' } })
        .classes()
        .join(' '),
    )
    expect(new Set(classes).size).toBe(variants.length)
  })
})

describe('ProgressBar', () => {
  const fill = (w: ReturnType<typeof mount>) =>
    (w.find('[data-testid="progress-fill"]').element as HTMLElement).style.width

  it('renders value as a percentage of max', () => {
    const wrapper = mount(ProgressBar, { props: { value: 30, max: 120, label: 'EXP' } })
    expect(fill(wrapper)).toBe('25%')
  })

  // EXP can exceed the level threshold before a level-up is applied;
  // the bar must not overflow its track or go negative.
  it('clamps the fill to 0–100%', () => {
    expect(fill(mount(ProgressBar, { props: { value: 500, max: 100, label: 'EXP' } }))).toBe('100%')
    expect(fill(mount(ProgressBar, { props: { value: -5, max: 100, label: 'EXP' } }))).toBe('0%')
  })

  it('treats max <= 0 as empty instead of NaN/Infinity', () => {
    expect(fill(mount(ProgressBar, { props: { value: 3, max: 0, label: 'EXP' } }))).toBe('0%')
    expect(fill(mount(ProgressBar, { props: { value: 3, max: -10, label: 'EXP' } }))).toBe('0%')
  })

  // Screen readers must not announce a value outside min..max.
  it('clamps aria-valuenow to the same range as the fill', () => {
    const bar = mount(ProgressBar, { props: { value: 500, max: 100, label: 'EXP' } })
    expect(bar.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
  })

  // Progress must be readable by screen readers, not only by color.
  it('exposes progressbar semantics', () => {
    const bar = mount(ProgressBar, { props: { value: 40, max: 80, label: '第一關進度' } }).find(
      '[role="progressbar"]',
    )
    expect(bar.attributes('aria-valuenow')).toBe('40')
    expect(bar.attributes('aria-valuemin')).toBe('0')
    expect(bar.attributes('aria-valuemax')).toBe('80')
    expect(bar.attributes('aria-label')).toBe('第一關進度')
  })
  // Self-learners need the actual numbers ("35 / 100 EXP"), not just a bar.
  it('shows value / max with a unit when unit is given, and exposes it to screen readers', () => {
    const wrapper = mount(ProgressBar, {
      props: { value: 35, max: 100, label: '經驗值', unit: 'EXP' },
    })
    expect(wrapper.text()).toContain('35 / 100 EXP')
    expect(wrapper.find('[role="progressbar"]').attributes('aria-valuetext')).toBe('35 / 100 EXP')
  })

  it('shows no value text when unit is omitted', () => {
    expect(mount(ProgressBar, { props: { value: 35, label: 'x' } }).text()).toBe('')
  })
})

describe('BaseTag', () => {
  it('renders its label with a distinct style per tone', () => {
    const tones = ['neutral', 'explore', 'reward', 'success', 'danger', 'bio'] as const
    const wrappers = tones.map((tone) =>
      mount(BaseTag, { props: { tone }, slots: { default: '標籤' } }),
    )
    expect(wrappers.every((w) => w.text() === '標籤')).toBe(true)
    expect(new Set(wrappers.map((w) => w.classes().join(' '))).size).toBe(tones.length)
  })
})

describe('BaseCard', () => {
  it('renders as the requested element so headings/sections stay semantic', () => {
    const wrapper = mount(BaseCard, { props: { as: 'section' }, slots: { default: '<p>內容</p>' } })
    expect(wrapper.element.tagName).toBe('SECTION')
    expect(wrapper.text()).toBe('內容')
  })
})
