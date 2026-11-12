import { test, expect } from '@playwright/test'
import { answer, bank } from './helpers'

// v1.1 Phase 2 弱點練習: from home, 5 questions on the weakest points, a result with each
// point's change, and mistakes on the 錯題本.
test.describe('弱點練習', () => {
  test('practise from home, see each point change, and find the mistake in the 錯題本', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByTestId('home-practice-link').click()
    await expect(page).toHaveURL(/\/practice\/bio-01$/)
    await expect(page.getByTestId('practice-targets')).toContainText('這次練習')
    await expect(page.getByTestId('practice-reason')).toHaveCount(3)
    for (let n = 1; n <= 5; n++) {
      await answer(page, n === 1)
      await page.getByTestId('quiz-next').click()
    }
    await expect(page.getByTestId('practice-score')).toHaveText('80 分')
    await expect(page.getByRole('heading', { name: '練習完成' })).toBeFocused()
    await expect(page.getByTestId('practice-exp')).toContainText('+20')
    await expect(page.getByTestId('practice-point')).toHaveCount(3)
    await expect(page.getByTestId('practice-point').first()).toContainText('最近答對')

    // Not a stage attempt: the stage stays uncleared on the map.
    await page.getByTestId('practice-to-review').click()
    await expect(page.getByTestId('review-status')).toHaveCount(1)
    await page.goto('/map')
    await expect(page.getByTestId('stage-status').first()).toContainText('可挑戰')
  })

  // §20 5.5: 必須允許學生自行選擇其他學習內容.
  test('知識掌握度 lets the student pick a point to practise', async ({ page }) => {
    await page.goto('/mastery')
    await page.getByRole('link', { name: '練這個：細胞核' }).click()
    await expect(page).toHaveURL(/\/practice\/bio-01\?k=b-nucleus$/)
    await expect(page.getByTestId('practice-reason')).toHaveText(['細胞核：還沒作答過'])
    await expect(page.getByTestId('quiz-question')).toBeFocused()
  })

  test('a point wrong twice in a row: lesson card first, then 知識掌握度 names it', async ({
    page,
  }) => {
    // Seeded, not played: which points a played practice reaches depends on the draw, and
    // multi-point questions can spread one practice's mistakes (Phase C review I1).
    const [q1, q2] = bank.filter((q) => q.knowledgeIds.join() === 'a-response')
    await page.goto('/')
    await page.evaluate(
      ({ ids }) => {
        const at = (s: number) => new Date(Date.UTC(2026, 10, 10, 0, 0, s)).toISOString()
        localStorage.setItem('bio-quest:player', 'me')
        localStorage.setItem(
          'bio-quest:events',
          JSON.stringify({
            version: 1,
            events: ids.map((id, i) => ({
              id: `seed${i}`,
              playerId: 'me',
              sessionId: 's',
              eventType: 'question_answered',
              knowledgeIds: ['a-response'],
              questionId: id,
              isCorrect: false,
              source: '2d',
              occurredAt: at(i),
              recordedAt: at(i),
            })),
          }),
        )
      },
      { ids: [q1!.id, q2!.id] },
    )

    // §20 5.2: the card comes before the questions; the first question then takes focus.
    await page.goto('/practice/bio-01')
    await expect(page.getByTestId('practice-lesson')).toBeVisible()
    await expect(page.getByTestId('practice-targets')).toContainText(
      '感應與反應：連續答錯 2 次，建議先看教材複習',
    )
    await page.getByTestId('practice-start').click()
    await expect(page.getByTestId('quiz-question')).toBeFocused()
    // All wrong: a-response, the first target, reaches 3 answers and is weak (§20 5.5).
    for (let n = 1; n <= 5; n++) {
      await answer(page, true)
      await page.getByTestId('quiz-next').click()
    }

    await page.goto('/mastery')
    const weak = page.getByTestId('mastery-weak')
    await expect(weak).toContainText('感應與反應：最近')
    await expect(weak).toContainText('建議先看教材複習')
    await weak.getByTestId('mastery-practice').click()
    await expect(page).toHaveURL(/\/practice\/bio-01$/)
    await expect(page.getByTestId('practice-card').first()).toContainText('感應與反應')
  })
})
