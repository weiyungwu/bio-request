import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import router from '@/router'

// TASK-001: the skeleton must boot with Pinia + Vue Router wired in and
// route `/` to the BIO QUEST home view. Every later task builds on this,
// so if the app can't mount with both plugins, nothing else matters.
describe('App skeleton', () => {
  it('mounts with Pinia and Router and renders the BIO QUEST home at /', async () => {
    router.push('/')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
    await flushPromises()

    expect(wrapper.find('h1').text()).toBe('BIO QUEST')
  })
})
