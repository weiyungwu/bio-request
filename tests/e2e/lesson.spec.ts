import { test, expect, type Page } from '@playwright/test'
import { finishLesson, playStory } from './helpers'

async function expectImageLoaded(page: Page) {
  await expect(page.locator('figure img')).toHaveJSProperty('complete', true)
  expect(
    await page.locator('figure img').evaluate((el: HTMLImageElement) => el.naturalWidth),
  ).toBeGreaterThan(0)
}

test.describe('Stage 1 lesson (TASK-006)', () => {
  test('story -> 16 knowledge points with images -> summary -> cell explorer', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await playStory(page)
    await expect(page.getByRole('heading', { name: '探險者訓練' })).toBeFocused()

    const position = page.getByTestId('lesson-position')
    await expect(position).toContainText('單元 A：生命的特徵・1 / 16')
    for (let n = 2; n <= 7; n++) {
      await page.getByTestId('lesson-next').click()
      await expect(position).toContainText(`${n} / 16`)
    }
    // Point 7 (細胞核) is the first with a diagram; it must load, not show a broken image.
    await expectImageLoaded(page)
    // Back to point 1 so finishLesson can walk the whole lesson from the start.
    for (let n = 6; n >= 1; n--) await page.getByTestId('lesson-prev').click()
    await expect(position).toContainText('1 / 16')

    await finishLesson(page)
    await expect(page.getByRole('heading', { name: '細胞城市探險' })).toBeFocused()
    expect(errors).toEqual([])
  })
})
