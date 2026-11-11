import type { MasteryLevel } from '@/types/mastery'

/** Each level's tag: text and icon, not colour alone (README: 狀態不可只靠顏色表示). */
export const MASTERY_LEVEL: Record<
  MasteryLevel,
  { label: string; tone: 'neutral' | 'explore' | 'reward' | 'success' }
> = {
  not_started: { label: '○ 未開始', tone: 'neutral' },
  learning: { label: '📖 學習中', tone: 'explore' },
  practicing: { label: '✏️ 練習中', tone: 'reward' },
  mastered: { label: '⭐ 已精熟', tone: 'success' },
}

export const percent = (accuracy: number) => `${Math.round(accuracy * 100)}%`
