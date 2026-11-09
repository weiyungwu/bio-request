import { test, expect, type Page } from '@playwright/test'
import { finishLesson, playStory } from './helpers'

// Points inside each structure, in the diagram's 320x240 viewBox coordinates.
// Thin or overlapped structures (wall band, membrane edge, cytoplasm gaps)
// are exactly where a center-of-box click would hit the wrong thing.
// Several points per thin structure: the wall band is x 34–48 and must be
// fully the wall; the membrane hit area may only extend inward.
const PLANT_EXTRA = [
  ['wall', [36, 120]],
  ['wall', [41, 120]],
  ['wall', [46, 120]],
  ['membrane', [50, 120]],
  ['cytoplasm', [56, 150]],
] as const
const PLANT = {
  wall: [40, 120],
  membrane: [49, 150],
  cytoplasm: [88, 150],
  nucleus: [74, 120],
  vacuole: [170, 120],
  chloroplast: [150, 48],
  mitochondrion: [226, 192],
} as const
const ANIMAL = {
  membrane: [60, 120],
  cytoplasm: [100, 130],
  nucleus: [165, 120],
  mitochondrion: [226, 150],
  vacuole: [226, 86],
} as const
const NAME = {
  wall: '細胞壁',
  membrane: '細胞膜',
  cytoplasm: '細胞質',
  nucleus: '細胞核',
  vacuole: '液胞',
  chloroplast: '葉綠體',
  mitochondrion: '粒線體',
} as const

async function tapAt(page: Page, [x, y]: readonly [number, number]) {
  const svg = page.locator('[aria-label="細胞互動圖"] svg')
  const box = (await svg.boundingBox())!
  const scale = box.width / 320
  await svg.click({ position: { x: x * scale, y: y * scale } })
}

test.describe('Cell explorer (TASK-007)', () => {
  test('tapping each structure on the diagram shows its own explanation, then the mission unlocks', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await playStory(page)
    await finishLesson(page)
    await expect(page.getByRole('heading', { name: '細胞城市探險' })).toBeFocused()

    const info = page.getByTestId('structure-info')
    for (const [id, point] of Object.entries(PLANT)) {
      await tapAt(page, point)
      await expect(info.locator('h3')).toContainText(NAME[id as keyof typeof NAME])
    }
    for (const [id, point] of PLANT_EXTRA) {
      await tapAt(page, point)
      await expect(info.locator('h3')).toContainText(NAME[id])
    }
    // Selecting the membrane must not shrink its own hit area.
    await tapAt(page, [49, 150])
    await tapAt(page, [52, 120])
    await expect(info.locator('h3')).toContainText('細胞膜')
    await page.getByTestId('cell-animal').click()
    for (const [id, point] of Object.entries(ANIMAL)) {
      await tapAt(page, point)
      await expect(info.locator('h3')).toContainText(NAME[id as keyof typeof NAME])
    }

    await page.getByTestId('explore-done').click()
    await expect(page.getByRole('heading', { name: '互動挑戰' })).toBeFocused()
    expect(errors).toEqual([])
  })

  test('has no horizontal overflow', async ({ page }) => {
    await playStory(page)
    await finishLesson(page)
    await expect(page.getByTestId('structure-info')).toBeVisible()
    const [scrollWidth, clientWidth] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ])
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
})
