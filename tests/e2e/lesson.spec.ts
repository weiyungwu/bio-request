import { test, expect, type Page } from '@playwright/test'
import { STORY_ADVANCE_COOLDOWN_MS } from '../../src/components/lesson/storyDialog'
import { finishLesson, playStory } from './helpers'

async function expectImageLoaded(page: Page) {
  await expect(page.locator('figure img')).toHaveJSProperty('complete', true)
  expect(
    await page.locator('figure img').evaluate((el: HTMLImageElement) => el.naturalWidth),
  ).toBeGreaterThan(0)
}

test.describe('Stage 1 lesson (TASK-006)', () => {
  test('story -> 23 knowledge points (diagrams load) -> summary -> cell explorer', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await playStory(page)
    await expect(page.getByRole('heading', { name: '探險者訓練' })).toBeFocused()

    const position = page.getByTestId('lesson-position')
    await expect(position).toContainText('單元 A：生命的特徵・1 / 23')
    for (let n = 2; n <= 8; n++) {
      await page.getByTestId('lesson-next').click()
      await expect(position).toContainText(`${n} / 23`)
    }
    // Point 8 (細胞核) is the first with a diagram; it must load, not show a broken image.
    await expectImageLoaded(page)
    // Back to point 1 so finishLesson can walk the whole lesson from the start.
    for (let n = 7; n >= 1; n--) await page.getByTestId('lesson-prev').click()
    await expect(position).toContainText('1 / 23')

    await finishLesson(page)
    await expect(page.getByRole('heading', { name: '細胞城市探險' })).toBeFocused()
    expect(errors).toEqual([])
  })

  // Human decision (2026-11-11): stage 1 is in two parts; a returning student goes straight to 下篇.
  test('下篇 starts at unit C without the story and leads on to the explorer', async ({ page }) => {
    await page.clock.install()
    await page.goto('/lesson/bio-01')
    await expect(page.getByTestId('part-choice')).toContainText('下篇：細胞的種類與物質運輸')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    await page.getByTestId('part-start-1').click()
    await expect(page.getByTestId('story-dialog')).toHaveCount(0)
    await expect(page.getByTestId('lesson-position')).toContainText('單元 C：細胞的種類・17 / 23')
    await expect(page.getByTestId('lesson-prev')).toBeDisabled()
    for (let n = 18; n <= 23; n++) {
      await page.getByTestId('lesson-next').click()
      await expect(page.getByTestId('lesson-position')).toContainText(`${n} / 23`)
    }
    await page.getByTestId('lesson-next').click()
    await expect(page.getByTestId('lesson-summary')).toBeVisible()
    await page.clock.fastForward(STORY_ADVANCE_COOLDOWN_MS + 50)
    await page.getByTestId('lesson-done').click()
    await expect(page.getByRole('heading', { name: '細胞城市探險' })).toBeFocused()
  })
})
