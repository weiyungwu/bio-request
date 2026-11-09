import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KnowledgeCard from '@/components/lesson/KnowledgeCard.vue'
import type { KnowledgePoint } from '@/types/lesson'

const point: KnowledgePoint = {
  id: 'k1',
  term: { zh: '粒線體', en: 'Mitochondrion' },
  definition: '粒線體是細胞進行有氧呼吸、產生 ATP 的重要場所。',
  plain: '細胞的能量發電廠。',
  example: '跑步時肌肉需要很多能量。',
  examTip: '粒線體與細胞能量供應有關。',
  images: [{ src: '/images/cells/animal-cell.svg', alt: '動物細胞示意圖', caption: '說明文字' }],
}

describe('KnowledgeCard', () => {
  // TASK-006: 正式名詞與白話解釋同時顯示 (FR-03 fields all on one card).
  it('shows formal term, definition and plain explanation together', () => {
    const text = mount(KnowledgeCard, { props: { point } }).text()
    for (const part of ['粒線體', 'Mitochondrion', point.definition, point.plain, point.example]) {
      expect(text).toContain(part)
    }
  })

  // Long Chinese terms must not be split across lines (known-issues, TASK-006).
  it('keeps the Chinese term on one line', () => {
    const zh = mount(KnowledgeCard, { props: { point } }).find('[data-testid="term-zh"]')
    expect(zh.text()).toBe('粒線體')
    expect(zh.classes()).toContain('whitespace-nowrap')
  })

  it('shows the exam tip as an important note', () => {
    const note = mount(KnowledgeCard, { props: { point } }).find('[data-testid="important-note"]')
    expect(note.text()).toContain('考試重點')
    expect(note.text()).toContain(point.examTip)
  })

  // TASK-006: 能正常顯示圖片及說明 — the caption carries the meaning, alt for screen readers.
  it('shows the image with alt text and a caption', () => {
    const w = mount(KnowledgeCard, { props: { point } })
    const img = w.find('figure img')
    expect(img.attributes('src')).toBe('/images/cells/animal-cell.svg')
    expect(img.attributes('alt')).toBe('動物細胞示意圖')
    expect(w.find('figure figcaption').text()).toBe('說明文字')
  })

  // spec 5.2 unit C: compare two diagrams — both must be visible at once.
  it('shows two images side by side for a comparison point', () => {
    const w = mount(KnowledgeCard, {
      props: {
        point: {
          ...point,
          images: [
            { src: '/images/cells/plant-cell.svg', alt: '植物細胞示意圖', caption: '植物' },
            { src: '/images/cells/animal-cell.svg', alt: '動物細胞示意圖', caption: '動物' },
          ],
        },
      },
    })
    const figures = w.findAll('figure')
    expect(figures.map((f) => f.find('figcaption').text())).toEqual(['植物', '動物'])
    expect(w.find('[data-testid="image-compare"]').classes()).toContain('sm:grid-cols-2')
  })

  it('renders no figure when the point has no image', () => {
    const { images: _images, ...noImage } = point
    expect(
      mount(KnowledgeCard, { props: { point: noImage } })
        .find('figure')
        .exists(),
    ).toBe(false)
  })
})
