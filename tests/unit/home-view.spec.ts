import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { useProgressStore } from '@/stores/progress'
import { EXP_PER_LEVEL } from '@/utils/level'

function setup(pinia: Pinia) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: HomeView },
      { path: '/map', component: { template: '<h1>map</h1>' } },
    ],
  })
  return { router, mount: () => mount(HomeView, { global: { plugins: [pinia, router] } }) }
}

describe('HomeView', () => {
  let pinia: Pinia
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('shows a usable default state when there is no learning data', () => {
    const wrapper = setup(pinia).mount()
    expect(wrapper.find('[data-testid="player-level"]').text()).toContain('Lv 1')
    expect(wrapper.find('[data-testid="player-exp"]').text()).toContain(`0 / ${EXP_PER_LEVEL} EXP`)
    expect(wrapper.find('[data-testid="recent-empty"]').exists()).toBe(true)
  })

  it('shows level, EXP progress and recent records from the progress store', () => {
    const store = useProgressStore()
    store.exp = EXP_PER_LEVEL + 35
    store.records = [
      { courseId: 'bio-01', score: 80, passed: true, completedAt: '2026-11-04T10:00:00Z' },
    ]
    const wrapper = setup(pinia).mount()

    expect(wrapper.find('[data-testid="player-level"]').text()).toContain('Lv 2')
    expect(wrapper.find('[data-testid="player-exp"]').text()).toContain(`35 / ${EXP_PER_LEVEL} EXP`)
    const items = wrapper.findAll('[data-testid="recent-record"]')
    expect(items).toHaveLength(1)
    // Students recognize stages by name, not by internal id.
    expect(items[0]!.text()).toContain('微觀世界探險隊')
    expect(items[0]!.text()).toContain('80')
    expect(items[0]!.text()).toContain('通過')
    expect(wrapper.find('[data-testid="recent-empty"]').exists()).toBe(false)
  })

  // TASK-003 acceptance: "可以進入關卡地圖".
  it('navigates to the stage map when 開始冒險 is clicked', async () => {
    const { router, mount } = setup(pinia)
    router.push('/')
    await router.isReady()
    const wrapper = mount()
    await wrapper.find('[data-testid="start-adventure"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/map')
  })
})
