import { test, expect } from '@playwright/test'

test.describe('Stage map (TASK-004)', () => {
  test('shows 8 stages and enters stage 1 from the map', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

    await page.goto('/map')
    await expect(page.getByTestId('stage-card')).toHaveCount(8)
    await expect(page.getByTestId('map-progress')).toContainText('已完成 0 / 8 關')
    await expect(page.getByTestId('stage-card').nth(1)).toContainText('🔒 未開放')

    await page.getByRole('link', { name: /微觀世界探險隊/ }).click()
    await expect(page).toHaveURL(/\/lesson\/bio-01$/)
    expect(errors).toEqual([])
  })

  test('locked stages cannot be entered, even by typing the URL', async ({ page }) => {
    await page.goto('/lesson/bio-02')
    await expect(page).toHaveURL(/\/map$/)
    await expect(page.getByTestId('stage-card').nth(1).getByRole('link')).toHaveCount(0)
  })

  test('has no horizontal overflow', async ({ page }) => {
    await page.goto('/map')
    await expect(page.getByTestId('stage-card')).toHaveCount(8)
    const [scrollWidth, clientWidth] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ])
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
})
