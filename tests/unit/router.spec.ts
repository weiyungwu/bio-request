import { describe, it, expect } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '@/router'

function makeRouter() {
  return createAppRouter(createMemoryHistory())
}

// TASK-004: 未開放關卡不可進入 — also when typing the URL directly.
describe('lesson route guard', () => {
  it('lets students enter an open stage', async () => {
    const router = makeRouter()
    await router.push('/lesson/bio-01')
    expect(router.currentRoute.value.fullPath).toBe('/lesson/bio-01')
  })

  // Changing only the param reuses the route; the guard must still run.
  it('blocks moving from an open stage to a locked one', async () => {
    const router = makeRouter()
    await router.push('/lesson/bio-01')
    await router.push('/lesson/bio-02')
    expect(router.currentRoute.value.fullPath).toBe('/map')
  })

  it.each(['/lesson/', '/lesson/bio-01/extra', '/nope'])(
    'sends unknown URL %s home',
    async (url) => {
      const router = makeRouter()
      await router.push(url)
      expect(router.currentRoute.value.fullPath).toBe('/')
    },
  )

  it.each(['bio-02', 'bio-08', 'does-not-exist'])('redirects /lesson/%s to the map', async (id) => {
    const router = makeRouter()
    await router.push(`/lesson/${id}`)
    expect(router.currentRoute.value.fullPath).toBe('/map')
  })
})

describe('LessonView placeholder', () => {
  it('shows the entered stage name, not a hard-coded one', async () => {
    const { mount } = await import('@vue/test-utils')
    const router = makeRouter()
    await router.push('/lesson/bio-01')
    const { default: LessonView } = await import('@/views/LessonView.vue')
    const wrapper = mount(LessonView, { global: { plugins: [router] } })
    expect(wrapper.find('h1').text()).toBe('微觀世界探險隊')
  })
})
