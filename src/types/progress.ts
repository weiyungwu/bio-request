/**
 * Per-course summary, field names per spec.txt §8.3. §8.3's per-course exp,
 * wrongQuestions and earnedBadges are kept globally in SavedProgress instead.
 */
export interface CourseProgress {
  courseId: string
  completed: boolean
  bestScore: number
  latestScore: number
}

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

/** A question answered wrong in a quiz (TASK-013 saves it; TASK-014's 錯題本 uses it). */
export interface WrongQuestion {
  /** Question id, unique across courses (e.g. "bio-01-q03"). */
  questionId: string
  courseId: string
  /** ISO 8601 timestamp of the latest wrong answer. */
  lastWrongAt: string
  /** 標記已熟悉 (TASK-014). A new wrong answer clears it. */
  mastered: boolean
}

/** Everything saved in LocalStorage (TASK-013, spec FR-08). */
export interface SavedProgress {
  version: 1
  exp: number
  records: LearningRecord[]
  courseProgress: Record<string, CourseProgress>
  /** Keyed by questionId, so two questions are never merged (TASK-014). */
  wrongQuestions: Record<string, WrongQuestion>
  /** Badge ids (TASK-015). */
  badges: string[]
}
