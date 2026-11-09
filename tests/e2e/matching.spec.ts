import { test, expect, type Page } from '@playwright/test'
import { finishExplorer, finishLesson, playStory } from './helpers'

const structure = (page: Page, name: string) =>
  page.getByTestId('match-structure').filter({ hasText: name })
const fn = (page: Page, text: string) =>
  page.getByTestId('match-function').filter({ hasText: text })

async function openGame(page: Page) {
  await playStory(page)
  await finishLesson(page)
  await finishExplorer(page)
}

test.describe('Matching game (TASK-008)', () => {
  test('wrong pair shows a hint, correct pairs lock in, result appears at the end', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await openGame(page)
    const feedback = page.getByTestId('matching-feedback')
    const progress = page.getByTestId('matching-progress')

    await structure(page, '粒線體').click()
    await fn(page, '控制物質進出細胞').click()
    await expect(feedback).toContainText('再想想')
    await expect(feedback).toContainText('提示：')
    await expect(progress).toHaveText('已配對 0 / 4')

    const answers: [string, string][] = [
      ['細胞核', '儲存遺傳物質'],
      ['粒線體', '呼吸作用'],
      ['葉綠體', '光合作用'],
      ['細胞膜', '控制物質進出細胞'],
    ]
    for (const [i, [name, text]] of answers.entries()) {
      await structure(page, name).click()
      await fn(page, text).click()
      await expect(feedback).toContainText('答對了')
      await expect(progress).toHaveText(`已配對 ${i + 1} / 4`)
    }
    // Tapping a finished pair again changes nothing. It is aria-disabled (kept focusable),
    // which Playwright's click() waits on, so dispatch the click the way a tap would.
    await structure(page, '細胞核').dispatchEvent('click')
    await fn(page, '儲存遺傳物質').dispatchEvent('click')
    await expect(progress).toHaveText('已配對 4 / 4')

    await expect(page.getByRole('heading', { name: '配對完成！' })).toBeFocused()
    await expect(page.getByTestId('matching-summary')).toContainText('配錯 1 次')
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
