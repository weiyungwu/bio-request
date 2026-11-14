import { test, expect, type Page } from '@playwright/test'
import {
  finishClassification,
  finishExplorer,
  finishLesson,
  finishMatching,
  playStory,
} from './helpers'

async function openGame(page: Page) {
  await playStory(page)
  await finishLesson(page)
  await finishExplorer(page)
  await finishMatching(page)
  await finishClassification(page)
  // TASK-015: first-time game reward is announced.
  await expect(page.getByTestId('reward-notice')).toContainText('植物還是動物？')
}

const card = (page: Page, pairId: string, kind: 'icon' | 'term') =>
  page.locator(`[data-testid="memory-card"][data-pair-id="${pairId}"][data-kind="${kind}"]`)

test.describe('Memory game', () => {
  test('a wrong pair shows feedback until dismissed, a correct pair locks in, result leads to the quiz', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await openGame(page)

    const ids = await page
      .getByTestId('memory-card')
      .evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute('data-pair-id')!))])
    expect(ids).toHaveLength(7)

    // A deliberate mismatch: the icon from one pair, the name from another.
    await card(page, ids[0]!, 'icon').click()
    await card(page, ids[1]!, 'term').click()
    await expect(page.getByTestId('memory-feedback')).toContainText('不是一對')
    await expect(card(page, ids[0]!, 'icon')).toHaveAttribute('aria-pressed', 'true')
    await page.getByTestId('memory-dismiss').click()
    await expect(card(page, ids[0]!, 'icon')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByTestId('memory-progress')).toHaveText('已配對 0 / 7')

    for (const id of ids) {
      await card(page, id, 'icon').click()
      await card(page, id, 'term').click()
    }
    await expect(page.getByRole('heading', { name: '記憶力配對完成！' })).toBeFocused()
    await expect(page.getByTestId('memory-summary')).toContainText('翻錯 1 次')

    // Phase 3 review I-03, now at the end of the games: leads to the stage quiz (TASK-011).
    await page.getByTestId('memory-to-quiz').click()
    await expect(page).toHaveURL(/\/quiz\/bio-01$/)
    expect(errors).toEqual([])
  })

  test('has no horizontal overflow', async ({ page }) => {
    await openGame(page)
    const [scrollWidth, clientWidth] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ])
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
})
