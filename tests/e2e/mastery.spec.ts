import { test, expect } from '@playwright/test'
import { playQuiz } from './helpers'

// v1.1 step 5: after a quiz, the student finds their knowledge points from home. All right,
// so no point can be weak whatever the draw: the page offers practice without 需要加強.
// (Weak points need 3 answers, SPEC v1.1 §20 5.5; see e2e/practice.spec.ts.)
test('知識掌握度 lists every point after a quiz and offers practice, without overflow', async ({
  page,
}) => {
  await playQuiz(page)
  await page.goto('/')
  await page.getByTestId('home-mastery-link').click()
  await expect(page).toHaveURL(/\/mastery$/)
  await expect(page.locator('h1')).toHaveText('知識掌握度')
  await expect(page.getByTestId('mastery-weak')).toHaveCount(0)
  await expect(page.getByTestId('mastery-practice')).toContainText('自動挑選')
  await expect(page.getByTestId('mastery-point')).toHaveCount(23)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})
