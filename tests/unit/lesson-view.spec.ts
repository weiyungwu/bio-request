import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '@/router'
import LessonView from '@/views/LessonView.vue'

// Use a name that differs from the real data, so a hard-coded
// "微觀世界探險隊" in the template would fail this test.
vi.mock('@/data/courses.json', () => ({
  default: [{ id: 'bio-01', title: 'T', storyTitle: '測試用關卡名', description: '', order: 1 }],
}))

async function mountLesson() {
  const router = createAppRouter(createMemoryHistory())
  await router.push('/lesson/bio-01')
  return mount(LessonView, { global: { plugins: [router] } })
}

describe('LessonView', () => {
  it('shows the entered stage name from course data', async () => {
    expect((await mountLesson()).find('h1').text()).toBe('測試用關卡名')
  })

  // Without a browser back button (PWA / webview) students must not get stuck.
  it('links back to the stage map', async () => {
    expect((await mountLesson()).find('a[href="/map"]').exists()).toBe(true)
  })

  // TASK-005: the story comes first; finishing it enters the lesson.
  it('starts with the story and enters the lesson when the story completes', async () => {
    const wrapper = await mountLesson()
    expect(wrapper.find('[data-testid="story-dialog"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="lesson-content"]').exists()).toBe(false)
    wrapper.findComponent({ name: 'StoryDialog' }).vm.$emit('complete')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="story-dialog"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="lesson-content"]').exists()).toBe(true)
  })
})
