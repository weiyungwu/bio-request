import { EVENT_SOURCES, EVENT_TYPES, type LearningEvent } from '@/types/learningEvent'

/**
 * Its own LocalStorage key, so bio-quest:progress never changes format (audit R1).
 * Value: `{ version: 1, events: LearningEvent[] }`.
 */
export const EVENTS_KEY = 'bio-quest:events'
const VERSION = 1

type Raw = Record<string, unknown>
const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown): v is string => typeof v === 'string' && v !== ''
// ISO 8601 with an explicit offset (as toISOString writes): other strings Date.parse accepts
// are read in local time, so devices in different zones would order events differently.
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/
const isDate = (v: unknown): v is string => isText(v) && ISO.test(v) && !Number.isNaN(Date.parse(v))
const optional = (v: unknown, valid: (v: unknown) => boolean) => v === undefined || valid(v)

const isEvent = (e: unknown): e is LearningEvent =>
  isObject(e) &&
  isText(e.id) &&
  isText(e.playerId) &&
  isText(e.sessionId) &&
  EVENT_TYPES.includes(e.eventType as never) &&
  Array.isArray(e.knowledgeIds) &&
  e.knowledgeIds.every(isText) &&
  optional(e.questionId, isText) &&
  optional(e.activityId, isText) &&
  optional(e.isCorrect, (v) => typeof v === 'boolean') &&
  optional(e.durationMs, (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0) &&
  optional(e.attemptNumber, (v) => Number.isInteger(v) && (v as number) >= 1) &&
  EVENT_SOURCES.includes(e.source as never) &&
  isDate(e.occurredAt) &&
  isDate(e.recordedAt)

const byTime = (a: LearningEvent, b: LearningEvent) =>
  Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * Union by id, in time order (ties by id, so every tab sorts the same). Events never change,
 * so on a repeated id the copy from `saved` (or the earlier one in a list) is kept.
 */
export function mergeEvents(
  saved: readonly LearningEvent[],
  added: readonly LearningEvent[],
): LearningEvent[] {
  const byId = new Map<string, LearningEvent>()
  for (const e of [...saved, ...added]) if (!byId.has(e.id)) byId.set(e.id, e)
  return [...byId.values()].sort(byTime)
}

export interface EventStore {
  events: LearningEvent[]
  /**
   * Saved entries this version can't read (e.g. an event type a later app added without a
   * new version). Never used, but written back untouched so they are not deleted.
   */
  unreadable: unknown[]
  /** false when a newer app version wrote the value: read nothing, never overwrite it. */
  writable: boolean
}

const empty = (writable: boolean): EventStore => ({ events: [], unreadable: [], writable })

/**
 * Unreadable JSON or a non-numeric/older version is corrupt: starts empty and may be
 * replaced (as with saved progress). Only a numeric version above 1 is protected.
 */
export function parseEventStore(text: string | null): EventStore {
  if (text === null) return empty(true)
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return empty(true)
  }
  if (!isObject(raw)) return empty(true)
  if (typeof raw.version === 'number' && raw.version > VERSION) return empty(false)
  if (raw.version !== VERSION || !Array.isArray(raw.events)) return empty(true)
  return {
    events: mergeEvents([], raw.events.filter(isEvent)),
    unreadable: raw.events.filter((e) => !isEvent(e)),
    writable: true,
  }
}

/** LocalStorage can be missing or throw (private mode, quota, disabled); never crash on it. */
export function readEventStorage(): string | null {
  try {
    return globalThis.localStorage?.getItem(EVENTS_KEY) ?? null
  } catch {
    return null
  }
}

/**
 * Appends events. Re-reads storage first so events another tab saved are kept (rule 4);
 * repeated ids are saved once (rule 7). Returns false when nothing could be written: a newer
 * version is stored, or storage is full or unavailable (the game carries on either way).
 */
export function recordEvents(added: readonly LearningEvent[]): boolean {
  const storage = globalThis.localStorage
  if (!storage) return false
  try {
    // Read inside the try: a failed read must stop the write, not look like "nothing saved".
    const saved = parseEventStore(storage.getItem(EVENTS_KEY))
    if (!saved.writable) return false
    const events = [...mergeEvents(saved.events, added), ...saved.unreadable]
    storage.setItem(EVENTS_KEY, JSON.stringify({ version: VERSION, events }))
    return true
  } catch {
    return false
  }
}
