import { test, expect } from '@playwright/test'
import { answer } from './helpers'

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

  test('知識掌握度 offers practice on the weak points', async ({ page }) => {
    // All wrong, twice: one practice gives a point too few answers to call it weak (§20 5.5);
    // the second practice returns to the same points, so they reach 3 answers.
    for (let round = 0; round < 2; round++) {
      await page.goto('/practice/bio-01')
      for (let n = 1; n <= 5; n++) {
        await answer(page, true)
        await page.getByTestId('quiz-next').click()
      }
    }
    await page.goto('/mastery')
    const weak = page.getByTestId('mastery-weak')
    await expect(weak).toBeVisible()
    await expect(weak).toContainText('答錯')
    await weak.getByTestId('mastery-practice').click()
    await expect(page).toHaveURL(/\/practice\/bio-01$/)
    await expect(page.getByTestId('quiz-submit')).toBeVisible()
  })
})
