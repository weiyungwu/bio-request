import { expect, type Page } from '@playwright/test'
import { STORY_ADVANCE_COOLDOWN_MS } from '../../src/components/lesson/storyDialog'

const PAST_COOLDOWN = STORY_ADVANCE_COOLDOWN_MS + 50

/** Opens stage 1 with a fake clock and plays through the story into the lesson. */
export async function playStory(page: Page) {
  await page.clock.install()
  await page.goto('/lesson/bio-01')
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

/** From the lesson's first point, reads all 16 points and the summary. */
export async function finishLesson(page: Page) {
  for (let n = 2; n <= 16; n++) {
    await page.getByTestId('lesson-next').click()
    await expect(page.getByTestId('lesson-position')).toContainText(`${n} / 16`)
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
