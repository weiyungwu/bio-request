import type { CourseProgress, LearningRecord, SavedProgress, WrongQuestion } from '@/types/progress'

/** LocalStorage key; the version lives inside the value. */
export const STORAGE_KEY = 'bio-quest:progress'

export const emptyProgress = (): SavedProgress => ({
  version: 1,
  exp: 0,
  records: [],
  courseProgress: {},
  wrongQuestions: {},
  badges: [],
})

type Raw = Record<string, unknown>
const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown): v is string => typeof v === 'string' && v !== ''
const isScore = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100
const isDate = (v: unknown): v is string => isText(v) && !Number.isNaN(Date.parse(v))

const isRecord = (r: unknown): r is LearningRecord =>
  isObject(r) &&
  isText(r.courseId) &&
  isScore(r.score) &&
  typeof r.passed === 'boolean' &&
  isDate(r.completedAt)

const isCourseProgress = (key: string, c: unknown): c is CourseProgress =>
  isObject(c) &&
  c.courseId === key &&
  typeof c.completed === 'boolean' &&
  isScore(c.bestScore) &&
  isScore(c.latestScore)

const isWrongQuestion = (key: string, w: unknown): w is WrongQuestion =>
  isObject(w) &&
  w.questionId === key &&
  isText(w.courseId) &&
  isDate(w.lastWrongAt) &&
  typeof w.mastered === 'boolean' &&
  (w.lastCorrectAt === undefined || isDate(w.lastCorrectAt))

/** Keeps the entries of a keyed object that pass `valid`. */
function pickEntries<T>(
  raw: unknown,
  valid: (key: string, v: unknown) => v is T,
): Record<string, T> {
  if (!isObject(raw)) return {}
  return Object.fromEntries(Object.entries(raw).filter(([k, v]) => valid(k, v))) as Record<
    string,
    T
  >
}

/**
 * Reads saved progress (spec TASK-013: JSON 資料格式錯誤時可安全初始化).
 * Unreadable JSON or another version → empty progress; otherwise each field and entry is
 * checked on its own, so one bad record never wipes the rest.
 */
export function parseProgress(text: string | null): SavedProgress {
  if (text === null) return emptyProgress()
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return emptyProgress()
  }
  if (!isObject(raw) || raw.version !== 1) return emptyProgress()
  const exp = raw.exp
  return {
    version: 1,
    exp: typeof exp === 'number' && Number.isFinite(exp) && exp > 0 ? Math.floor(exp) : 0,
    records: Array.isArray(raw.records) ? raw.records.filter(isRecord) : [],
    courseProgress: pickEntries(raw.courseProgress, isCourseProgress),
    wrongQuestions: pickEntries(raw.wrongQuestions, isWrongQuestion),
    badges: Array.isArray(raw.badges) ? [...new Set(raw.badges.filter(isText))] : [],
  }
}

/** LocalStorage can be missing or throw (private mode, quota, disabled); never crash on it. */
export function readStorage(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

export function writeStorage(data: SavedProgress): boolean {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function clearStorage(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY)
  } catch {
    // Nothing saved that we could remove; the in-memory reset still applies.
  }
}
