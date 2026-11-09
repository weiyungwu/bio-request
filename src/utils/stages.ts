import type { CourseProgress } from '@/types/progress'

/**
 * Stages whose content is built and playable. MVP: only stage 1
 * (spec: 初版只有第一關開放). Add an id here when its lesson/quiz data ships.
 */
export const OPEN_COURSE_IDS: readonly string[] = ['bio-01']

/** spec FR-01: 已完成 (completed), 進行中 (in-progress), 尚未解鎖 (locked); plus open = not yet attempted. */
export type StageStatus = 'locked' | 'open' | 'in-progress' | 'completed'

export function isCourseOpen(courseId: string): boolean {
  return OPEN_COURSE_IDS.includes(courseId)
}

export function stageStatus(
  courseId: string,
  progress: Record<string, CourseProgress>,
): StageStatus {
  if (!isCourseOpen(courseId)) return 'locked'
  const course = progress[courseId]
  if (!course) return 'open'
  return course.completed ? 'completed' : 'in-progress'
}
