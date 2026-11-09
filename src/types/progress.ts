/**
 * One finished stage attempt (activity log), used for 最近學習紀錄 and, later,
 * the daily quiz-EXP cap. Not in spec.txt §8.3, which stores one summary per
 * course (best/latest score) without timestamps; see docs/progression.md §6.
 */
export interface LearningRecord {
  courseId: string
  /** 0–100 */
  score: number
  passed: boolean
  /** ISO 8601 timestamp; write with Date#toISOString() (UTC). */
  completedAt: string
}
