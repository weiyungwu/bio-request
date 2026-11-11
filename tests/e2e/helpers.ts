import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'
import { STORY_ADVANCE_COOLDOWN_MS } from '../../src/components/lesson/storyDialog'

const PAST_COOLDOWN = STORY_ADVANCE_COOLDOWN_MS + 50

/**
 * Opens stage 1 with a fake clock, chooses 上篇 and plays through the story into the lesson.
 * With `open: false` it plays from the lesson page already shown; the caller must have
 * installed the clock before loading the app.
 */
export async function playStory(page: Page, { open = true } = {}) {
  if (open) {
    await page.clock.install()
    await page.goto('/lesson/bio-01')
  }
  await page.getByTestId('part-start-0').click()
  const counter = page.getByText(/^\d+ \/ 6$/)
  await expect(counter).toHaveText('1 / 6')
  for (let n = 2; n <= 6; n++) {
    await page.clock.fastForward(PAST_COOLDOWN)
    await page.getByTestId('story-next').click()
    await expect(counter).toHaveText(`${n} / 6`)
  }
  await page.clock.fastForward(PAST_COOLDOWN)
  await page.getByTestId('story-next').click()
  await expect(page.getByTestId('mission-card')).toBeVisible()
  await page.clock.fastForward(PAST_COOLDOWN)
  await page.getByTestId('mission-start').click()
  await expect(page.getByTestId('lesson-position')).toBeVisible()
}

/** From the lesson's first point, reads all 23 points (past the 上篇 rest screen) and the summary. */
export async function finishLesson(page: Page) {
  for (let n = 2; n <= 23; n++) {
    await page.getByTestId('lesson-next').click()
    if (n === 17) {
      await expect(page.getByTestId('lesson-rest')).toContainText('上篇完成')
      await page.getByTestId('lesson-continue').click()
    }
    await expect(page.getByTestId('lesson-position')).toContainText(`${n} / 23`)
  }
  await page.getByTestId('lesson-next').click()
  await expect(page.getByTestId('lesson-summary')).toBeVisible()
  // The button must name the section it opens (heading 細胞城市探險), not a later one.
  await expect(page.getByTestId('lesson-done')).toContainText('細胞城市探險')
  await page.clock.fastForward(PAST_COOLDOWN)
  await page.getByTestId('lesson-done').click()
}

/** Completes the cell explorer mission with the structure buttons and enters the games. */
export async function finishExplorer(page: Page) {
  const chip = (id: string) =>
    page.locator(`[data-testid="structure-chip"][data-structure="${id}"]`)
  for (const id of ['nucleus', 'mitochondrion', 'membrane', 'wall', 'chloroplast']) {
    await chip(id).click()
  }
  await page.getByTestId('cell-animal').click()
  await chip('nucleus').click()
  await page.getByTestId('explore-done').click()
  await expect(page.getByRole('heading', { name: '互動挑戰' })).toBeFocused()
}

/** Completes the matching game without mistakes and opens the classification game. */
export async function finishMatching(page: Page) {
  const answers: [string, string][] = [
    ['細胞核', '儲存遺傳物質'],
    ['粒線體', '呼吸作用'],
    ['葉綠體', '光合作用'],
    ['細胞膜', '控制物質進出細胞'],
  ]
  for (const [name, text] of answers) {
    await page.getByTestId('match-structure').filter({ hasText: name }).click()
    await page.getByTestId('match-function').filter({ hasText: text }).click()
  }
  await page.getByTestId('matching-done').click()
  await expect(page.getByRole('heading', { name: '植物還是動物？' })).toBeFocused()
}

/** Classification answer key per spec.txt 5.2 unit C. */
export const CLASSIFICATION_KEY: Record<string, string> = {
  細胞核: '兩者皆有',
  細胞膜: '兩者皆有',
  細胞質: '兩者皆有',
  粒線體: '兩者皆有',
  葉綠體: '植物細胞',
  液胞: '兩者皆有',
  細胞壁: '植物細胞',
}

/** Sorts all 7 structures correctly and waits for the game's result. */
export async function finishClassification(page: Page) {
  for (let n = 1; n <= 7; n++) {
    const name = (await page.getByTestId('classification-item').textContent())!.trim()
    await page
      .getByTestId('classification-choice')
      .filter({ hasText: CLASSIFICATION_KEY[name]! })
      .click()
    await expect(page.getByTestId('classification-feedback')).toContainText('答對了')
    await page.getByTestId('classification-next').click()
  }
  await expect(page.getByRole('heading', { name: '分類完成！' })).toBeFocused()
}

type Q = {
  question: string
  type: string
  options: string[] | { left: string[] }
  answer: number | number[]
}
const bank: Q[] = JSON.parse(readFileSync('src/data/questions/bio-01.json', 'utf8'))

/** Answers the shown question from the key (or deliberately wrong) and submits. */
export async function answer(page: Page, wrong: boolean, submit = 'quiz-submit') {
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
  await page.getByTestId(submit).click()
}

/** Plays a whole stage 1 quiz from /quiz/bio-01, answering the `wrong` question numbers (1-5) wrong. */
export async function playQuiz(page: Page, wrong: number[] = []) {
  await page.goto('/quiz/bio-01')
  for (let n = 1; n <= 5; n++) {
    await answer(page, wrong.includes(n))
    await page.getByTestId('quiz-next').click()
  }
  await expect(page).toHaveURL(/\/result\/bio-01$/)
}
