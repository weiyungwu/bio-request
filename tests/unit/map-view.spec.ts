import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import MapView from '@/views/MapView.vue'
import { createAppRouter } from '@/router'
import { useProgressStore } from '@/stores/progress'
import courses from '@/data/courses.json'

async function mountMap(pinia: Pinia) {
  const router = createAppRouter(createMemoryHistory())
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

  it('labels an attempted but not completed stage 進行中', async () => {
    useProgressStore().courseProgress = {
      'bio-01': { courseId: 'bio-01', completed: false, bestScore: 50, latestScore: 50 },
    }
    const { wrapper } = await mountMap(pinia)
    const first = wrapper.findAll('[data-testid="stage-card"]')[0]!
    expect(first.text()).toContain('⏳ 進行中')
    expect(first.find('a').exists()).toBe(true)
    expect(wrapper.find('[data-testid="map-progress"]').text()).toContain('已完成 0 / 8 關')
  })

  // A score of 0 is still a real best score; don't hide it as "missing".
  it('shows a best score of 0', async () => {
    useProgressStore().courseProgress = {
      'bio-01': { courseId: 'bio-01', completed: true, bestScore: 0, latestScore: 0 },
    }
    const { wrapper } = await mountMap(pinia)
    expect(wrapper.findAll('[data-testid="stage-card"]')[0]!.text()).toContain('最佳 0 分')
  })

  // Students who clear stage 1 must not think a low score kept stage 2 locked.
  it('explains that locked stages are still being made, not earned by score', async () => {
    const { wrapper } = await mountMap(pinia)
    expect(wrapper.find('[data-testid="locked-notice"]').text()).toContain('製作中')
  })

  // Touch screens have no hover glow, so say in text that a cleared stage is replayable.
  it('tells students a completed stage can be replayed', async () => {
    useProgressStore().courseProgress = {
      'bio-01': { courseId: 'bio-01', completed: true, bestScore: 90, latestScore: 90 },
    }
    const { wrapper } = await mountMap(pinia)
    expect(wrapper.findAll('[data-testid="stage-card"]')[0]!.text()).toContain('再次挑戰')
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
