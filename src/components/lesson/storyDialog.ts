/**
 * Clicks within this window after a line (or the mission card) appears are
 * ignored, so rapid tapping cannot skip lines or the mission briefing (TASK-005).
 * LessonCard reuses it for the 重點整理 summary (TASK-006).
 */
export const STORY_ADVANCE_COOLDOWN_MS = 400
