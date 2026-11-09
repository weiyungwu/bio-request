import { test, expect, type Page } from '@playwright/test'
import { STORY_ADVANCE_COOLDOWN_MS } from '../../src/components/lesson/storyDialog'

async function expectImageLoaded(page: Page) {
  await expect(page.locator('figure img')).toHaveJSProperty('complete', true)
  expect(
    await page.locator('figure img').evaluate((el: HTMLImageElement) => el.naturalWidth),
  ).toBeGreaterThan(0)
}

test.describe('Stage 1 lesson (TASK-006)', () => {
  test('story -> 16 knowledge points with images -> summary -> next step', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.clock.install()
    await page.goto('/lesson/bio-01')

    // Through the story (covered in detail by story.spec.ts). Wait for each line
    // to render before skipping the cooldown, or the click lands inside it.
    const counter = page.getByText(/^\d+ \/ 6$/)
    await expect(counter).toHaveText('1 / 6')
    for (let n = 2; n <= 6; n++) {
      await page.clock.fastForward(STORY_ADVANCE_COOLDOWN_MS + 50)
      await page.getByTestId('story-next').click()
      await expect(counter).toHaveText(`${n} / 6`)
    }
    await page.clock.fastForward(STORY_ADVANCE_COOLDOWN_MS + 50)
    await page.getByTestId('story-next').click()
    await expect(page.getByTestId('mission-card')).toBeVisible()
    await page.clock.fastForward(STORY_ADVANCE_COOLDOWN_MS + 50)
    await page.getByTestId('mission-start').click()
    await expect(page.getByRole('heading', { name: '探險者訓練' })).toBeFocused()

    const position = page.getByTestId('lesson-position')
    await expect(position).toContainText('單元 A：生命的特徵・1 / 16')

    const goTo = async (n: number) => {
      await page.getByTestId('lesson-next').click()
      await expect(position).toContainText(`${n} / 16`)
    }
    for (let n = 2; n <= 7; n++) await goTo(n)
    // Point 7 (細胞核) is the first with a diagram; it must load, not show a broken image.
    await expectImageLoaded(page)
    for (let n = 8; n <= 16; n++) await goTo(n)
    await expect(position).toContainText('單元 C：植物細胞與動物細胞')

    await page.getByTestId('lesson-next').click()
    await expect(page.getByTestId('lesson-summary')).toContainText('粒線體')
    await page.getByTestId('lesson-done').click()
    await expect(page.getByRole('heading', { name: '互動挑戰' })).toBeFocused()
    expect(errors).toEqual([])
  })
})
