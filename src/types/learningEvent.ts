/**
 * Learning events (v1.1 SPEC §4.2): one append-only record per learning action, shared by
 * the 2D and 3D games. Kept apart from SavedProgress (see docs/audit/v1.1-…-audit.md §6).
 */

export const EVENT_TYPES = [
  'lesson_viewed',
  'knowledge_reviewed',
  'quiz_started',
  'question_answered',
  'quiz_completed',
  'interaction_completed',
  'quest_completed',
  'mistake_reviewed',
] as const
export type LearningEventType = (typeof EVENT_TYPES)[number]

export const EVENT_SOURCES = ['2d', '3d'] as const

/** Read-only: events are never changed after they are recorded (rule 4). */
export type LearningEvent = Readonly<{
  /** Unique; a resent event with the same id is counted once (rule 7). */
  id: string
  /** Anonymous per-browser id, no personal data (rule 6). */
  playerId: string
  sessionId: string
  eventType: LearningEventType
  /** Knowledge point ids (empty for whole-quiz events such as quiz_started). */
  knowledgeIds: readonly string[]
  questionId?: string
  activityId?: string
  isCorrect?: boolean
  durationMs?: number
  /** 1 for the first try. */
  attemptNumber?: number
  source: (typeof EVENT_SOURCES)[number]
  /** When it happened. */
  occurredAt: string
  /** When it was saved (rule 5: kept apart from occurredAt; missing from the §4.2 interface). */
  recordedAt: string
}>
