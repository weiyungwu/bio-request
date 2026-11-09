import { test, expect } from '@playwright/test'
import { answer, playQuiz } from './helpers'

// TASK-014: from the result page into the 錯題本, and back after a reload.
test.describe('錯題本 (TASK-014)', () => {
  test('wrong questions are listed, retried, marked 已熟悉 and kept after reload', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await playQuiz(page, [1, 2])
    await page.getByTestId('result-to-review').click()
    await expect(page).toHaveURL(/\/review$/)
    const items = page.getByTestId('review-item')
    await expect(items).toHaveCount(2)
    await expect(page.getByTestId('review-summary')).toContainText('還有 2 題待複習')

    // 查看正確答案與解析.
    await items.first().getByTestId('review-toggle-answer').click()
    await expect(items.first().getByTestId('review-answer')).toContainText('解析：')

    // 重新作答 correctly → status updates.
    await items.first().getByTestId('review-retry').click()
    await answer(page, false, 'review-submit')
    await expect(page.getByTestId('quiz-feedback')).toContainText('答對了')
    await expect(items.first().getByTestId('review-retried')).toBeVisible()

    // 標記已熟悉 → it moves after the 待複習 one and survives a reload.
    await items.first().getByTestId('review-mastered').click()
    await expect(page.getByTestId('review-summary')).toContainText('還有 1 題待複習')
    await page.reload()
    await expect(page.getByTestId('review-summary')).toContainText('還有 1 題待複習')
    await expect(items.last().getByTestId('review-status')).toHaveText('✓ 已熟悉')

    await page.goto('/')
    await expect(page.getByTestId('home-review-link')).toContainText('1 題待複習')
    expect(errors).toEqual([])
  })

  test('has no horizontal overflow with a retry open', async ({ page }) => {
    await playQuiz(page, [1, 2, 3, 4, 5])
    await page.goto('/review')
    // Each click opens a retry and removes that button, so always take the first one left.
    const retry = page.getByTestId('review-retry')
    await expect(retry).toHaveCount(5)
    for (let n = 5; n > 0; n--) {
      await retry.first().click()
      await expect(retry).toHaveCount(n - 1)
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
