import { test, expect, type Page } from '@playwright/test'
import { STORY_ADVANCE_COOLDOWN_MS } from '../../src/components/lesson/storyDialog'

const PAST_COOLDOWN_MS = STORY_ADVANCE_COOLDOWN_MS + 50

async function openStory(page: Page) {
  // Fake clock: lets the test jump past the per-line cooldown deterministically.
  await page.clock.install()
  await page.goto('/lesson/bio-01')
  const counter = page.getByText(/^\d+ \/ 6$/)
  await expect(counter).toHaveText('1 / 6')
  return counter
}

test.describe('Stage 1 story (TASK-005)', () => {
  test('plays every line in order, then the mission card leads into the lesson', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    const counter = await openStory(page)

    for (let n = 2; n <= 6; n++) {
      await page.clock.fastForward(PAST_COOLDOWN_MS)
      await page.getByTestId('story-next').click()
      await expect(counter).toHaveText(`${n} / 6`)
    }
    await page.clock.fastForward(PAST_COOLDOWN_MS)
    await page.getByTestId('story-next').click()
    await expect(page.getByTestId('mission-card')).toContainText('細胞城市大搜查')
    await expect(page.getByRole('heading', { name: '細胞城市大搜查' })).toBeFocused()

    await page.clock.fastForward(PAST_COOLDOWN_MS)
    await page.getByTestId('mission-start').click()
    await expect(page.getByRole('heading', { name: '探險者訓練' })).toBeFocused()
    expect(errors).toEqual([])
  })

  // TASK-005: 不會因快速點擊而跳過必要流程
  test('a burst of clicks advances at most one line', async ({ page }) => {
    const counter = await openStory(page)
    await page.clock.fastForward(PAST_COOLDOWN_MS)
    const next = page.getByTestId('story-next')
    await next.click()
    await next.click()
    await next.click()
    await expect(counter).toHaveText('2 / 6')
  })
})
