import { describe, it, expect } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from '@/router'

function makeRouter() {
  return createRouter({ history: createMemoryHistory(), routes })
}

// TASK-004: 未開放關卡不可進入 — also when typing the URL directly.
describe('lesson route guard', () => {
  it('lets students enter an open stage', async () => {
    const router = makeRouter()
    await router.push('/lesson/bio-01')
    expect(router.currentRoute.value.fullPath).toBe('/lesson/bio-01')
  })

  it.each(['bio-02', 'bio-08', 'does-not-exist'])('redirects /lesson/%s to the map', async (id) => {
    const router = makeRouter()
    await router.push(`/lesson/${id}`)
    expect(router.currentRoute.value.fullPath).toBe('/map')
  })
})
