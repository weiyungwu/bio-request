import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// The map must follow `order`, not the file's array order, so editing
// courses.json can't silently reshuffle the adventure.
vi.mock('@/data/courses.json', () => ({
  default: [
    { id: 'c3', title: 'T3', storyTitle: '第三', description: '', order: 3 },
    { id: 'c1', title: 'T1', storyTitle: '第一', description: '', order: 1 },
    { id: 'c2', title: 'T2', storyTitle: '第二', description: '', order: 2 },
  ],
}))

describe('MapView ordering', () => {
  it('sorts stages by order', async () => {
    const { default: MapView } = await import('@/views/MapView.vue')
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: {} },
        { path: '/:p(.*)*', component: {} },
      ],
    })
    const wrapper = mount(MapView, { global: { plugins: [createPinia(), router] } })
    const titles = wrapper.findAll('[data-testid="stage-card"] h2').map((h) => h.text())
    expect(titles).toEqual(['第一', '第二', '第三'])
  })
})
