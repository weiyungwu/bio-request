import type { CourseProgress, LearningRecord } from '@/types/progress'

/** spec.txt FR-07 badges (TASK-015). Conditions are derived from saved progress. */
export interface Badge {
  id: string
  name: string
  /** 取得條件, shown to students. */
  condition: string
  icon: string
}

/** Stages about cells (Human decision, TASK-015): 生命與細胞 and 細胞分裂. */
export const CELL_COURSE_IDS = ['bio-01', 'bio-02'] as const
export const ALL_COURSE_COUNT = 8

export const BADGES: readonly Badge[] = [
  { id: 'first-clear', name: '初級探索員', condition: '完成第一關', icon: '🧭' },
  { id: 'cell-expert', name: '細胞專家', condition: '完成第 1、2 關（細胞相關關卡）', icon: '🔬' },
  { id: 'quiz-ace', name: '答題高手', condition: '單次測驗達 90 分', icon: '🎯' },
  { id: 'perfect-clear', name: '完美通關', condition: '關卡測驗全對', icon: '💯' },
  { id: 'bio-master', name: '生物大師', condition: '完成全部八關', icon: '👑' },
]

/** Badge ids whose condition the progress meets, in BADGES order. */
export function earnedBadgeIds(
  courseProgress: Record<string, CourseProgress>,
  records: readonly LearningRecord[],
): string[] {
  const cleared = (id: string) => courseProgress[id]?.completed === true
  const clearedCount = Object.values(courseProgress).filter((c) => c.completed).length
  const met: Record<string, boolean> = {
    'first-clear': cleared('bio-01'),
    'cell-expert': CELL_COURSE_IDS.every(cleared),
    'quiz-ace': records.some((r) => r.score >= 90),
    'perfect-clear': records.some((r) => r.score === 100),
    'bio-master': clearedCount >= ALL_COURSE_COUNT,
  }
  return BADGES.filter((b) => met[b.id]).map((b) => b.id)
}

/** Local calendar day (the student's device, e.g. Asia/Taipei) for the daily cap. */
export function localDay(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}
