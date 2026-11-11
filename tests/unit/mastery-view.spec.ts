import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '@/router'
import { getQuestionBank } from '@/data/questions'
import type { LearningEvent } from '@/types/learningEvent'
import { EVENTS_KEY } from '@/utils/learningEventStorage'
import { PLAYER_KEY } from '@/utils/learningEvents'
import MasteryView from '@/views/MasteryView.vue'
import HomeView from '@/views/HomeView.vue'

const questions = getQuestionBank('bio-01')!.questions
let n = 0
function answer(questionId: string, correct: boolean, playerId = 'me'): LearningEvent {
  const at = new Date(Date.UTC(2026, 10, 10, 0, 0, n++)).toISOString()
  return {
    id: `e${n}`,
    playerId,
    sessionId: 's',
    eventType: 'question_answered',
    knowledgeIds: questions.find((q) => q.id === questionId)!.knowledgeIds,
    questionId,
    isCorrect: correct,
    source: '2d',
    occurredAt: at,
    recordedAt: at,
  }
}
function seed(events: LearningEvent[]) {
  localStorage.setItem(PLAYER_KEY, 'me')
  localStorage.setItem(EVENTS_KEY, JSON.stringify({ version: 1, events }))
}
async function mountView(view: typeof MasteryView | typeof HomeView = MasteryView) {
  setActivePinia(createPinia())
  const router = createAppRouter(createMemoryHistory())
  await router.push(view === MasteryView ? '/mastery' : '/')
  const w = mount(view, { global: { plugins: [router] } })
  await flushPromises()
  return { w, router }
}
const row = (w: Awaited<ReturnType<typeof mountView>>['w'], id: string) =>
  w.find(`[data-testid="mastery-point"][data-id="${id}"]`)

describe('MasteryView (v1.1 step 5)', () => {
  it('lists every stage-1 knowledge point as 未開始 before any answer', async () => {
    const { w } = await mountView()
    expect(w.findAll('[data-testid="mastery-point"]')).toHaveLength(23)
    expect(row(w, 'b-nucleus').text()).toContain('未開始')
    expect(w.find('[data-testid="mastery-weak"]').exists()).toBe(false)
    expect(w.find('[data-testid="mastery-empty"]').text()).toContain('完成關卡測驗')
  })

  // §4.7: the report names specific weak knowledge, and points to where to practise.
  it('names the weakest points with their accuracy and links to the 錯題本', async () => {
    seed([answer('bio-01-q01', false), answer('bio-01-q01', false), answer('bio-01-q04', true)])
    const { w } = await mountView()
    const weak = w.find('[data-testid="mastery-weak"]')
    expect(weak.text()).toContain('感應與反應')
    expect(weak.text()).not.toContain('細胞質') // 1/1 right is not weak
    expect(weak.find('a[href="/review"]').exists()).toBe(true)
    expect(row(w, 'a-response').text()).toContain('答對 0 / 2 次（0%）')
    expect(row(w, 'a-response').text()).toContain('學習中')
    expect(w.find('[data-testid="mastery-empty"]').exists()).toBe(false)
  })

  // Audit §6 point 7: tell students why a point can't reach 已精熟 yet.
  it('says when a point does not have enough questions yet', async () => {
    // Trim a point to 3 on purpose: real points fill up batch by batch.
    const bank = getQuestionBank('bio-01')!
    const all = bank.questions
    const extra = all.filter((q) => q.knowledgeIds.includes('a-growth')).slice(3)
    bank.questions = all.filter((q) => !extra.includes(q))
    try {
      const { w } = await mountView()
      const few = row(w, 'a-growth').find('[data-testid="mastery-few"]')
      expect(few.text()).toContain('題目還在增加中')
      expect(few.text()).toContain('目前 3 題')
    } finally {
      bank.questions = all
    }
  })

  // Every stage-1 point has questions now, but a later stage's points start with none.
  it('says when a point has no questions at all', async () => {
    const bank = getQuestionBank('bio-01')!
    const all = bank.questions
    bank.questions = all.filter((q) => !q.knowledgeIds.includes('a-growth'))
    try {
      const { w } = await mountView()
      expect(row(w, 'a-growth').find('[data-testid="mastery-few"]').text()).toContain('還沒有題目')
    } finally {
      bank.questions = all
    }
  })

  it("ignores another player's answers on a shared device", async () => {
    seed([answer('bio-01-q01', false, 'someone-else')])
    const { w } = await mountView()
    expect(row(w, 'a-response').text()).toContain('未開始')
  })

  // Viewing a report has no side effects: no player id is made just by looking.
  it('does not create a player id', async () => {
    await mountView()
    expect(localStorage.getItem(PLAYER_KEY)).toBeNull()
  })

  it('is reachable from the home page', async () => {
    const { w } = await mountView(HomeView)
    expect(w.find('[data-testid="home-mastery-link"]').attributes('href')).toBe('/mastery')
  })
})
