import { test, expect, type Page } from '@playwright/test'
import { finishExplorer, finishLesson, finishMatching, playStory } from './helpers'

// Answer key per spec.txt 5.2 unit C.
const answers: Record<string, string> = {
  細胞核: '兩者皆有',
  細胞膜: '兩者皆有',
  細胞質: '兩者皆有',
  粒線體: '兩者皆有',
  葉綠體: '植物細胞',
  液胞: '兩者皆有',
  細胞壁: '植物細胞',
}

async function openGame(page: Page) {
  await playStory(page)
  await finishLesson(page)
  await finishExplorer(page)
  await finishMatching(page)
}

test.describe('Classification game (TASK-009)', () => {
  test('judges each answer, shows the full analysis and can be retried', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await openGame(page)
    const item = page.getByTestId('classification-item')
    const feedback = page.getByTestId('classification-feedback')
    const choice = (label: string) =>
      page.getByTestId('classification-choice').filter({ hasText: label })

    for (let n = 1; n <= 7; n++) {
      await expect(page.getByTestId('classification-progress')).toHaveText(`第 ${n} / 7 題`)
      const name = (await item.textContent())!.trim()
      // Get the first structure wrong on purpose; "動物細胞" is never right in stage 1.
      await choice(n === 1 ? '動物細胞' : answers[name]!).click()
      await expect(feedback).toContainText(n === 1 ? '不對喔' : '答對了')
      await page.getByTestId('classification-next').click()
    }

    await expect(page.getByRole('heading', { name: '分類完成！' })).toBeFocused()
    await expect(page.getByTestId('classification-summary')).toContainText('答對 6 個')
    await expect(page.getByTestId('classification-review')).toHaveCount(7)
    await expect(page.getByTestId('classification-result')).toContainText('你的答案：動物細胞')

    await page.getByTestId('classification-retry').click()
    await expect(page.getByTestId('classification-progress')).toHaveText('第 1 / 7 題')
    await expect(item).toBeFocused()
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
