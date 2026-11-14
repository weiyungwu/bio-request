import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CharacterAvatar from '@/components/common/CharacterAvatar.vue'

describe('CharacterAvatar', () => {
  it.each(['captain', 'miko'])('draws an illustration for %s, not the emoji fallback', (id) => {
    const w = mount(CharacterAvatar, { props: { characterId: id, fallback: '🧑‍🔬' } })
    expect(w.find('svg').exists()).toBe(true)
    expect(w.text()).not.toContain('🧑‍🔬')
  })

  // Characters without art yet (lesson.ts: avatar is "a placeholder until character art exists").
  it('falls back to the emoji for a character with no illustration', () => {
    const w = mount(CharacterAvatar, { props: { characterId: 'new-character', fallback: '🧪' } })
    expect(w.find('svg').exists()).toBe(false)
    expect(w.text()).toBe('🧪')
  })

  it('is decorative: both forms are hidden from assistive tech', () => {
    const svg = mount(CharacterAvatar, { props: { characterId: 'captain', fallback: '🧑‍🔬' } })
    expect(svg.find('svg').attributes('aria-hidden')).toBe('true')
    const emoji = mount(CharacterAvatar, { props: { characterId: 'x', fallback: '🧪' } })
    expect(emoji.find('span').attributes('aria-hidden')).toBe('true')
  })
})
