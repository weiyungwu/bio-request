import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { useProgressStore } from '@/stores/progress'

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
    expect(wrapper.find('[data-testid="player-level"]').text()).toBe('Lv.1 生物新手')
    expect(wrapper.find('[data-testid="player-exp"]').text()).toContain('0 EXP')
    expect(wrapper.find('[data-testid="player-exp"]').text()).toContain('距離 Lv.2 還差 100 EXP')
    expect(wrapper.find('[data-testid="recent-empty"]').exists()).toBe(true)
  })

  it('shows level, EXP progress and recent records from the progress store', () => {
    const store = useProgressStore()
    store.exp = 520
    store.records = [
      { courseId: 'bio-01', score: 80, passed: true, completedAt: '2026-11-04T10:00:00Z' },
    ]
    const wrapper = setup(pinia).mount()

    expect(wrapper.find('[data-testid="player-level"]').text()).toBe('Lv.4 細胞探索員')
    expect(wrapper.find('[data-testid="player-exp"]').text()).toContain('520 EXP')
    expect(wrapper.find('[data-testid="player-exp"]').text()).toContain('距離 Lv.5 還差 180 EXP')
    // Bar shows progress within the current level: (520-450)/(700-450) = 28%.
    expect(wrapper.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('70')
    expect(wrapper.find('[role="progressbar"]').attributes('aria-valuemax')).toBe('250')
    const items = wrapper.findAll('[data-testid="recent-record"]')
    expect(items).toHaveLength(1)
    // Students recognize stages by name, not by internal id.
    expect(items[0]!.text()).toContain('微觀世界探險隊')
    expect(items[0]!.text()).toContain('80 分')
    expect(items[0]!.text()).toContain('✓ 通過')
    expect(items[0]!.text()).not.toContain('未通過')
    expect(wrapper.find('[data-testid="recent-empty"]').exists()).toBe(false)
  })

  // TASK-003 acceptance: "可以進入關卡地圖".
  // "未通過" contains "通過", so assert the failing case explicitly.
  it('marks a failed attempt as ✗ 未通過', () => {
    useProgressStore().records = [
      { courseId: 'bio-01', score: 40, passed: false, completedAt: '2026-11-04T10:00:00Z' },
    ]
    const item = setup(pinia).mount().find('[data-testid="recent-record"]')
    expect(item.text()).toContain('✗ 未通過')
    expect(item.text()).not.toContain('✓')
  })

  // Two attempts can finish in the same second; both must render without
  // Vue key collisions. Vue only checks keys when it has to reorder a list,
  // so replace an old list with an entirely new one.
  it('renders records that share a completedAt timestamp', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = useProgressStore()
    store.records = [
      { courseId: 'bio-01', score: 10, passed: false, completedAt: '2026-11-01T10:00:00Z' },
      { courseId: 'bio-01', score: 20, passed: false, completedAt: '2026-11-02T10:00:00Z' },
    ]
    const wrapper = setup(pinia).mount()
    store.records = [
      { courseId: 'bio-01', score: 40, passed: false, completedAt: '2026-11-05T10:00:00Z' },
      { courseId: 'bio-02', score: 90, passed: true, completedAt: '2026-11-05T10:00:00Z' },
      { courseId: 'bio-03', score: 70, passed: false, completedAt: '2026-11-04T10:00:00Z' },
    ]
    await nextTick()
    expect(wrapper.findAll('[data-testid="recent-record"]')).toHaveLength(3)
    expect(warn.mock.calls.flat().join(' ')).not.toMatch(/Duplicate keys/)
    warn.mockRestore()
  })

  it('shows a max-level message instead of a next-level target at Lv.10', () => {
    useProgressStore().exp = 5000
    const wrapper = setup(pinia).mount()
    expect(wrapper.find('[data-testid="player-level"]').text()).toBe('Lv.10 傳奇探索者')
    expect(wrapper.find('[data-testid="player-exp"]').text()).toContain('已達最高等級')
  })

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
