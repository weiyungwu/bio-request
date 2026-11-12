import { test, expect, type Page } from '@playwright/test'
import { STORY_ADVANCE_COOLDOWN_MS, STORY_TYPE_MS } from '../../src/components/lesson/storyDialog'

const PAST_COOLDOWN_MS = STORY_ADVANCE_COOLDOWN_MS + 50
// Past a line's typing too (lines are under 100 characters). Use runFor, not fastForward:
// fastForward fires each timer once, so the typing interval would add only one character.
const PAST_LINE = STORY_ADVANCE_COOLDOWN_MS + 100 * STORY_TYPE_MS

async function openStory(page: Page) {
  // Fake clock: lets the test jump past the per-line cooldown deterministically.
  await page.clock.install()
  await page.goto('/lesson/bio-01')
  await page.getByTestId('part-start-0').click()
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
      await page.clock.runFor(PAST_LINE)
      await page.getByTestId('story-next').click()
      await expect(counter).toHaveText(`${n} / 6`)
    }
    await page.clock.runFor(PAST_LINE)
    await page.getByTestId('story-next').click()
    await expect(page.getByTestId('mission-card')).toContainText('細胞城市大搜查')
    await expect(page.getByRole('heading', { name: '細胞城市大搜查' })).toBeFocused()

    await page.clock.fastForward(PAST_COOLDOWN_MS)
    await page.getByTestId('mission-start').click()
    await expect(page.getByRole('heading', { name: '探險者訓練' })).toBeFocused()
    expect(errors).toEqual([])
  })

  // Human request (2026-11-12): 略過故事 goes straight to 探險者訓練.
  test('略過故事 skips to the lesson', async ({ page }) => {
    await openStory(page)
    await page.clock.fastForward(PAST_COOLDOWN_MS)
    // Keyboard: 下一段 comes first, so Tab + Enter can't skip by accident.
    await page.getByTestId('story-dialog').focus()
    await page.keyboard.press('Tab')
    await expect(page.getByTestId('story-next')).toBeFocused()
    await page.getByTestId('story-skip').click()
    await expect(page.getByRole('heading', { name: '探險者訓練' })).toBeFocused()
    await expect(page.getByTestId('mission-card')).toHaveCount(0)
  })

  // Human request (2026-11-13): the line types out; 下一段 mid-line shows it all, then moves on.
  test('a line types out, and 下一段 first shows the rest of it', async ({ page }) => {
    const counter = await openStory(page)
    const typed = page.getByTestId('story-typed')
    await page.clock.fastForward(PAST_COOLDOWN_MS)
    await expect(typed).not.toHaveText(/緊急任務！總部收到一則神秘訊息/)
    await page.getByTestId('story-next').click()
    await expect(typed).toContainText('請立刻派人調查')
    await expect(page.getByTestId('story-more')).toBeVisible()
    await expect(counter).toHaveText('1 / 6')
    await page.clock.fastForward(PAST_COOLDOWN_MS)
    await page.getByTestId('story-next').click()
    await expect(counter).toHaveText('2 / 6')
  })

  // TASK-005: 不會因快速點擊而跳過必要流程
  test('a burst of clicks advances at most one line', async ({ page }) => {
    const counter = await openStory(page)
    await page.clock.runFor(PAST_LINE)
    const next = page.getByTestId('story-next')
    await next.click()
    await next.click()
    await next.click()
    await expect(counter).toHaveText('2 / 6')
  })
})
