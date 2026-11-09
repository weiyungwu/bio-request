import type { CourseProgress } from '@/types/progress'

/**
 * Stages whose content is built and playable. MVP: only stage 1
 * (spec: 初版只有第一關開放). Add an id here when its lesson/quiz data ships.
 */
export const OPEN_COURSE_IDS: readonly string[] = ['bio-01']

export type StageStatus = 'locked' | 'open' | 'completed'

export function isCourseOpen(courseId: string): boolean {
  return OPEN_COURSE_IDS.includes(courseId)
}

export function stageStatus(
  courseId: string,
  progress: Record<string, CourseProgress>,
): StageStatus {
  if (!isCourseOpen(courseId)) return 'locked'
  return progress[courseId]?.completed ? 'completed' : 'open'
}
