/**
 * Clicks within this window after a line (or the mission card) appears are
 * ignored, so rapid tapping cannot skip lines or the mission briefing (TASK-005).
 * LessonCard reuses it for the 重點整理 summary (TASK-006).
 */
export const STORY_ADVANCE_COOLDOWN_MS = 400

/** Story lines type out one character per tick (Human request 2026-11-13: a talking feel). */
export const STORY_TYPE_MS = 35

/** Time for a line to finish typing out (characters, not UTF-16 units). */
export const storyLineMs = (text: string) => Array.from(text).length * STORY_TYPE_MS
