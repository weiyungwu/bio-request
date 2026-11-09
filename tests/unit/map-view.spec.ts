import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import MapView from '@/views/MapView.vue'
import { routes } from '@/router'
import { useProgressStore } from '@/stores/progress'
import courses from '@/data/courses.json'

async function mountMap(pinia: Pinia) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/map')
  const wrapper = mount(MapView, { global: { plugins: [pinia, router] } })
  return { wrapper, router }
}

describe('MapView', () => {
  let pinia: Pinia
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('shows all eight stages in order with mission name and topic', async () => {
    const { wrapper } = await mountMap(pinia)
    const cards = wrapper.findAll('[data-testid="stage-card"]')
    expect(cards).toHaveLength(8)
    cards.forEach((card, i) => {
      expect(card.text()).toContain(courses[i]!.storyTitle)
      expect(card.text()).toContain(courses[i]!.title)
    })
  })

  it('makes only the open stage a link; locked stages say so in text', async () => {
    const { wrapper } = await mountMap(pinia)
    const cards = wrapper.findAll('[data-testid="stage-card"]')
    expect(cards[0]!.find('a').attributes('href')).toBe('/lesson/bio-01')
    for (const card of cards.slice(1)) {
      expect(card.find('a').exists()).toBe(false)
      expect(card.text()).toContain('🔒 未開放')
    }
  })

  it('enters stage 1 when its card is clicked', async () => {
    const { wrapper, router } = await mountMap(pinia)
    await wrapper.findAll('[data-testid="stage-card"]')[0]!.find('a').trigger('click')
    // The lesson route is lazy-loaded, so navigation settles after the chunk import.
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/lesson/bio-01'))
  })

  // TASK-004 acceptance: 完成第一關後，進度狀態正確更新 (live, without reload).
  it('updates stage status, best score and overall progress when stage 1 is completed', async () => {
    const { wrapper } = await mountMap(pinia)
    expect(wrapper.find('[data-testid="map-progress"]').text()).toContain('已完成 0 / 8 關')

    useProgressStore().courseProgress = {
      'bio-01': { courseId: 'bio-01', completed: true, bestScore: 90, latestScore: 80 },
    }
    await nextTick()

    expect(wrapper.find('[data-testid="map-progress"]').text()).toContain('已完成 1 / 8 關')
    const first = wrapper.findAll('[data-testid="stage-card"]')[0]!
    expect(first.text()).toContain('✓ 已完成')
    expect(first.text()).toContain('最佳 90 分')
    // A completed stage can still be replayed.
    expect(first.find('a').attributes('href')).toBe('/lesson/bio-01')
  })
})
