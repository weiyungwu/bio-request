import type { LearningEvent } from '@/types/learningEvent'
import { recordEvents } from '@/utils/learningEventStorage'

/** Anonymous id for this browser (v1.1 rule 6: no personal data); kept across visits. */
export const PLAYER_KEY = 'bio-quest:player'

/**
 * crypto.randomUUID only exists on secure pages (https, localhost); getRandomValues also
 * works over plain http, e.g. a classroom opening the site by IP address.
 */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}

/** Used only while storage is unavailable: one id for this page load. */
let fallbackPlayerId: string | undefined
function getPlayerId(): string {
  try {
    const storage = globalThis.localStorage
    if (storage) {
      const saved = storage.getItem(PLAYER_KEY)
      if (saved) return saved
      const id = newId()
      storage.setItem(PLAYER_KEY, id)
      return id
    }
  } catch {
    // Private mode, quota or disabled storage: fall through to the in-memory id.
  }
  return (fallbackPlayerId ??= newId())
}

/** One page load. */
const sessionId = newId()

export type EventInput = Pick<LearningEvent, 'eventType' | 'knowledgeIds'> &
  Partial<Pick<LearningEvent, 'questionId' | 'activityId' | 'isCorrect'>>

/**
 * Records one learning event from the 2D game. Never throws and returns nothing: losing an
 * event (storage full, newer data stored) must not interrupt learning (audit R3).
 */
export function logEvent(input: EventInput, now = new Date()): void {
  recordEvents([
    {
      ...input,
      id: newId(),
      playerId: getPlayerId(),
      sessionId,
      source: '2d',
      occurredAt: now.toISOString(),
      recordedAt: new Date().toISOString(),
    },
  ])
}
