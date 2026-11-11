import { test, expect, type Page } from '@playwright/test'
import { answer, playQuiz } from './helpers'

// v1.1 step 3 (audit §7 E2E): answers are kept as learning events in their own key, and
// saved progress keeps its format.
const read = (page: Page, key: string) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), key)

type Event = { eventType: string; activityId?: string; isCorrect?: boolean }

test('a quiz and a 錯題本 retry are saved as learning events, kept after reload', async ({
  page,
}) => {
  await playQuiz(page, [2])
  let events: Event[] = (await read(page, 'bio-quest:events')).events
  expect(events.map((e) => e.eventType)).toEqual([
    'quiz_started',
    ...Array(5).fill('question_answered'),
    'quiz_completed',
  ])
  expect(events.filter((e) => e.isCorrect === false)).toHaveLength(1)
  // Saved progress stays version 1; events live under their own key. `practice` (弱點練習,
  // v1.1 Phase 2) is the one added field, optional so older saves still load.
  const progress = await read(page, 'bio-quest:progress')
  expect(progress.version).toBe(1)
  expect(Object.keys(progress).sort()).toEqual(
    [
      'badges',
      'claimed',
      'courseProgress',
      'exp',
      'practice',
      'records',
      'version',
      'wrongQuestions',
    ].sort(),
  )

  await page.getByTestId('result-to-review').click()
  await page.getByTestId('review-retry').first().click()
  await answer(page, false, 'review-submit')
  await page.reload()
  events = (await read(page, 'bio-quest:events')).events
  expect(events).toHaveLength(8)
  expect(events.at(-1)).toMatchObject({ eventType: 'question_answered', activityId: 'review' })

  // 再挑戰 from the result page is one new attempt: exactly one more quiz_started.
  await page.goto('/result/bio-01')
  await playQuiz(page)
  events = (await read(page, 'bio-quest:events')).events
  expect(events.filter((e) => e.eventType === 'quiz_started')).toHaveLength(2)
})
