/** One finished stage attempt, shown in 最近學習紀錄. */
export interface LearningRecord {
  courseId: string
  /** 0–100 */
  score: number
  passed: boolean
  /** ISO 8601 timestamp */
  completedAt: string
}
