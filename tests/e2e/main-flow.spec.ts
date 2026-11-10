import { test, expect } from '@playwright/test'
import {
  answer,
  finishClassification,
  finishExplorer,
  finishLesson,
  finishMatching,
  playStory,
} from './helpers'

// Spec 4.2: the 11-step main flow in one go, the way a first-time student meets the app.
// Steps 1–9 are clicks only (no typed URLs), so every hand-off between pages is covered.
test('main flow: home → stage 1 → quiz → result → 錯題本, kept after reload', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  await page.clock.install()

  // 1. 開啟首頁.
  await page.goto('/')
  await expect(page.getByTestId('recent-empty')).toBeVisible()

  // 2. 進入第一關: home → map → stage card.
  await page.getByTestId('start-adventure').click()
  await expect(page).toHaveURL(/\/map$/)
  await page.getByTestId('stage-link').first().click()
  await expect(page).toHaveURL(/\/lesson\/bio-01$/)

  // 3. 完成故事對話. 4. 閱讀教學內容.
  await playStory(page, { open: false })
  await finishLesson(page)

  // 5. 完成互動遊戲: cell explorer, matching, classification.
  await finishExplorer(page)
  await finishMatching(page)
  await finishClassification(page)

  // 6. 進入考試.
  await page.getByTestId('classification-to-quiz').click()
  await expect(page).toHaveURL(/\/quiz\/bio-01$/)

  // 7. 完成測驗: question 2 wrong, so the 錯題本 has something in it.
  for (let n = 1; n <= 5; n++) {
    await answer(page, n === 2)
    await page.getByTestId('quiz-next').click()
  }

  // 8. 查看測驗結果.
  await expect(page).toHaveURL(/\/result\/bio-01$/)
  await expect(page.getByTestId('result-score')).toHaveText('80 分')
  await expect(page.getByTestId('result-wrong')).toHaveCount(1)
  const wrongQuestion = (await page.getByTestId('result-wrong').textContent())!

  // 9. 查看錯題本: the same question the result page listed.
  await page.getByTestId('result-to-review').click()
  await expect(page).toHaveURL(/\/review$/)
  const items = page.getByTestId('review-item')
  await expect(items).toHaveCount(1)
  expect(wrongQuestion).toContain((await items.first().locator('h3').textContent())!.trim())

  // Back home inside the app (no reload) to note the EXP this run earned.
  await page.getByRole('link', { name: '← 回首頁' }).click()
  await expect(page.getByTestId('player-exp')).not.toContainText(/\b0 EXP/)
  const exp = (await page.getByTestId('player-exp').textContent())!

  // 10. 重新整理頁面. 11. 確認學習紀錄仍存在 — the same EXP, and the record on every page.
  await page.reload()
  await expect(page.getByTestId('player-exp')).toHaveText(exp)
  await expect(page.getByTestId('recent-record')).toHaveCount(1)
  await expect(page.getByTestId('recent-record')).toContainText('80 分')
  await expect(page.getByTestId('home-review-link')).toContainText('1 題待複習')

  await page.goto('/review')
  await expect(items).toHaveCount(1)
  await expect(page.getByTestId('review-summary')).toContainText('還有 1 題待複習')

  await page.goto('/map')
  await expect(page.getByTestId('stage-card').first()).toContainText('✓ 已完成')
  await expect(page.getByTestId('stage-card').first()).toContainText('最佳 80 分')
  expect(errors).toEqual([])
})
