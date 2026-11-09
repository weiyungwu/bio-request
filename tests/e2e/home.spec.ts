import { test, expect } from '@playwright/test'

test.describe('Home (TASK-003)', () => {
  test('first-time student sees default state and can enter the stage map', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

    await page.goto('/')
    await expect(page.getByTestId('player-level')).toContainText('Lv 1')
    await expect(page.getByTestId('recent-empty')).toBeVisible()

    await page.getByRole('button', { name: /開始冒險/ }).click()
    await expect(page).toHaveURL(/\/map$/)
    await expect(page.locator('h1')).toHaveText('關卡地圖')
    expect(errors).toEqual([])
  })

  // TASK-003 acceptance: 手機畫面不會出現水平溢位 (runs on desktop and Pixel 5 projects).
  test('has no horizontal overflow', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('player-level')).toBeVisible()
    const [scrollWidth, clientWidth] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ])
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
})
