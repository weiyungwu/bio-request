import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '@/router'
import LessonView from '@/views/LessonView.vue'

// Use a name that differs from the real data, so a hard-coded
// "微觀世界探險隊" in the template would fail this test.
vi.mock('@/data/courses.json', () => ({
  default: [{ id: 'bio-01', title: 'T', storyTitle: '測試用關卡名', description: '', order: 1 }],
}))

async function mountLesson(attach = false) {
  const router = createAppRouter(createMemoryHistory())
  await router.push('/lesson/bio-01')
  return mount(LessonView, {
    global: { plugins: [router, createPinia()] },
    ...(attach ? { attachTo: document.body } : {}),
  })
}

// Stage 1 is in two parts (上篇／下篇, Human decision 2026-11-11): the page first asks where to start.
async function startPart(wrapper: Awaited<ReturnType<typeof mountLesson>>, part: number) {
  await wrapper.find(`[data-testid="part-start-${part}"]`).trigger('click')
}

describe('LessonView', () => {
  it('shows the entered stage name from course data', async () => {
    expect((await mountLesson()).find('h1').text()).toBe('測試用關卡名')
  })

  // Without a browser back button (PWA / webview) students must not get stuck.
  it('links back to the stage map', async () => {
    expect((await mountLesson()).find('a[href="/map"]').exists()).toBe(true)
  })

  it('asks which part to start from, naming each part and its size', async () => {
    const wrapper = await mountLesson()
    const choice = wrapper.find('[data-testid="part-choice"]').text()
    expect(choice).toContain('上篇：生命的特徵與細胞構造')
    expect(choice).toContain('單元 A、B・16')
    expect(choice).toContain('下篇：細胞的種類與物質運輸')
    expect(choice).toContain('單元 C、D・7')
    expect(wrapper.find('[data-testid="story-dialog"]').exists()).toBe(false)
  })

  // TASK-005: the story comes first; finishing it enters the lesson.
  it('starts 上篇 with the story and enters the lesson when the story completes', async () => {
    const wrapper = await mountLesson()
    await startPart(wrapper, 0)
    expect(wrapper.find('[data-testid="story-dialog"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="lesson-content"]').exists()).toBe(false)
    wrapper.findComponent({ name: 'StoryDialog' }).vm.$emit('complete')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="story-dialog"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="lesson-content"]').exists()).toBe(true)
  })

  it('moves focus to the lesson heading after the story', async () => {
    const wrapper = await mountLesson(true)
    await startPart(wrapper, 0)
    wrapper.findComponent({ name: 'StoryDialog' }).vm.$emit('complete')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(document.activeElement?.id).toBe('lesson-heading')
    wrapper.unmount()
  })

  // TASK-006 fills the lesson step; finishing it moves on to the games step.
  it('shows the lesson cards after the story, then the next step after the lesson', async () => {
    const wrapper = await mountLesson()
    await startPart(wrapper, 0)
    wrapper.findComponent({ name: 'StoryDialog' }).vm.$emit('complete')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'LessonCard' }).exists()).toBe(true)
    wrapper.findComponent({ name: 'LessonCard' }).vm.$emit('complete')
    await wrapper.vm.$nextTick()
    // TASK-007: the cell explorer comes between the lesson and the games.
    expect(wrapper.findComponent({ name: 'CellExplorer' }).exists()).toBe(true)
    wrapper.findComponent({ name: 'CellExplorer' }).vm.$emit('complete')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="game-content"]').exists()).toBe(true)
  })

  // A student coming back for 下篇 skips the story and cannot step back into 上篇.
  it('starts 下篇 at unit C without the story', async () => {
    const wrapper = await mountLesson(true)
    await startPart(wrapper, 1)
    expect(wrapper.find('[data-testid="story-dialog"]').exists()).toBe(false)
    const position = wrapper.find('[data-testid="lesson-position"]').text()
    expect(position).toContain('單元 C：細胞的種類・17 / 23')
    expect(wrapper.find('[data-testid="lesson-prev"]').attributes('disabled')).toBeDefined()
    expect(document.activeElement?.id).toBe('lesson-heading')
    wrapper.unmount()
  })

  // Review I: the clicked 上篇 button disappears; focus must not fall to <body>.
  it('moves focus to the story after choosing 上篇', async () => {
    const wrapper = await mountLesson(true)
    await startPart(wrapper, 0)
    await wrapper.vm.$nextTick()
    expect(document.activeElement?.getAttribute('data-testid')).toBe('story-dialog')
    wrapper.unmount()
  })

  // The choice is per visit: leaving for another stage and coming back asks again.
  it('asks again after switching stages', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/lesson/bio-01')
    const wrapper = mount(LessonView, { global: { plugins: [router, createPinia()] } })
    await startPart(wrapper, 1)
    expect(wrapper.find('[data-testid="part-choice"]').exists()).toBe(false)
    await router.push('/lesson/bio-02')
    await router.push('/lesson/bio-01')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="part-choice"]').exists()).toBe(true)
  })
})
