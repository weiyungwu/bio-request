import { test, expect } from '@playwright/test'
import { playQuiz } from './helpers'

// TASK-013: progress lives in LocalStorage.
test.describe('Saved progress (TASK-013)', () => {
  test('a finished quiz survives a reload and a new browser tab', async ({ page, context }) => {
    await playQuiz(page, [2])
    await expect(page.getByTestId('result-badges')).toContainText('初級探索員')
    await page.reload()
    // The attempt itself is in memory; the saved progress is what remains.
    await expect(page.getByTestId('result-empty')).toBeVisible()

    await page.goto('/')
    await expect(page.getByTestId('recent-record')).toHaveCount(1)
    await expect(page.getByTestId('recent-record')).toContainText('80 分')
    // TASK-015: 成就狀態重新載入後仍存在.
    await expect(page.locator('[data-testid="badge"][data-earned="true"]')).toHaveText(/初級探索員/)
    await expect(page.locator('main')).toContainText('50 EXP')

    // Same storage, new page: what reopening the site sees.
    const again = await context.newPage()
    await again.goto('/map')
    await expect(again.getByText('✓ 已完成')).toBeVisible()
  })

  test('corrupt saved data starts a first-time student instead of crashing', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('bio-quest:progress', '{broken'))
    await page.reload()
    await expect(page.getByTestId('recent-empty')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('reset asks for confirmation, then clears everything for good', async ({ page }) => {
    await playQuiz(page)
    await page.goto('/')
    await page.getByTestId('reset-data').click()
    await page.getByTestId('reset-cancel').click()
    await expect(page.getByTestId('recent-record')).toHaveCount(1)

    await page.getByTestId('reset-data').click()
    await page.getByTestId('reset-yes').click()
    await expect(page.getByTestId('reset-status')).toContainText('已重設')
    await expect(page.getByTestId('recent-empty')).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('recent-empty')).toBeVisible()
  })
})
