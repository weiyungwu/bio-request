import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

type Q = {
  question: string
  type: string
  options: string[] | { left: string[] }
  answer: number | number[]
}
const bank: Q[] = JSON.parse(readFileSync('src/data/questions/bio-01.json', 'utf8'))

/** Answers the shown question from the key (or deliberately wrong) and submits. */
async function answer(page: Page, wrong: boolean) {
  const text = (await page.getByTestId('quiz-question').textContent())!.trim()
  const q = bank.find((b) => b.question === text)!
  if (typeof q.answer === 'number') {
    const n = (q.options as string[]).length
    const i = wrong ? (q.answer + 1) % n : q.answer
    await page.locator(`[data-testid="quiz-option"][data-index="${i}"]`).click()
  } else {
    const key = wrong ? [...q.answer].reverse() : q.answer
    const selects = page.getByTestId('quiz-select')
    for (const [slot, v] of key.entries()) await selects.nth(slot).selectOption(String(v))
  }
  await page.getByTestId('quiz-submit').click()
}

test.describe('Stage quiz (TASK-011)', () => {
  test('five questions, one wrong: feedback each time, 80 points, restart clears', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.goto('/quiz/bio-01')
    const progress = page.getByTestId('quiz-progress')
    const seen = new Set<string>()

    for (let n = 1; n <= 5; n++) {
      await expect(progress).toContainText(`第 ${n} / 5 題`)
      await expect(page.getByTestId('quiz-submit')).toBeDisabled()
      seen.add((await page.getByTestId('quiz-question').textContent())!)
      await answer(page, n === 3)
      const feedback = page.getByTestId('quiz-feedback')
      await expect(feedback).toBeFocused()
      await expect(feedback).toContainText(n === 3 ? '答錯了' : '答對了')
      await expect(feedback).toContainText('解析：')
      await page.getByTestId('quiz-next').click()
    }
    // 同一題不會在同一份試卷中重複出現.
    expect(seen.size).toBe(5)

    // TASK-012: the result page — score, counts, EXP and the wrong question explained.
    await expect(page).toHaveURL(/\/result\/bio-01$/)
    await expect(page.getByTestId('result-score')).toHaveText('80 分')
    await expect(page.getByTestId('result-verdict')).toContainText('通過')
    await expect(page.getByTestId('result-counts')).toContainText('答對 4 題 · 答錯 1 題')
    await expect(page.getByTestId('result-exp')).toContainText('+50')
    await expect(page.getByTestId('result-wrong')).toHaveCount(1)
    await expect(page.getByTestId('result-wrong')).toContainText('解析：')

    // The cleared stage shows on the map (TASK-004: 完成第一關後，進度狀態正確更新).
    await page.getByRole('link', { name: '回關卡地圖', exact: true }).click()
    await expect(page).toHaveURL(/\/map$/)
    await expect(page.getByText('✓ 已完成')).toBeVisible()
    await page.goBack()

    await page.getByTestId('result-retry').click()
    await expect(progress).toContainText('第 1 / 5 題 · 還剩 5 題')
    await expect(page.getByTestId('quiz-submit')).toBeDisabled()
    expect(errors).toEqual([])
  })

  test('has no horizontal overflow, with feedback shown', async ({ page }) => {
    await page.goto('/quiz/bio-01')
    for (let n = 1; n <= 5; n++) {
      await answer(page, true)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
      await page.getByTestId('quiz-next').click()
    }
    await expect(page.getByTestId('result-verdict')).toContainText('未通過')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
