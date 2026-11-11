import { test, expect } from '@playwright/test'
import { playQuiz } from './helpers'

// v1.1 step 5: after a quiz, the student finds their weak knowledge points from home.
test('知識掌握度 shows the weak points of the last quiz, without overflow', async ({ page }) => {
  await playQuiz(page, [1, 2, 3])
  await page.goto('/')
  await page.getByTestId('home-mastery-link').click()
  await expect(page).toHaveURL(/\/mastery$/)
  await expect(page.locator('h1')).toHaveText('知識掌握度')
  await expect(page.getByTestId('mastery-weak')).toBeVisible()
  await expect(page.getByTestId('mastery-point')).toHaveCount(23)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})
