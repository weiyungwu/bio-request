import { describe, it, expect } from 'vitest'
import type { LearningEvent } from '@/types/learningEvent'
import {
  EVENTS_KEY,
  mergeEvents,
  parseEventStore,
  readEventStorage,
  recordEvents,
} from '@/utils/learningEventStorage'

const event = (id: string, occurredAt: string, extra: Partial<LearningEvent> = {}) =>
  ({
    id,
    playerId: 'p1',
    sessionId: 's1',
    eventType: 'question_answered',
    knowledgeIds: ['b-nucleus'],
    questionId: 'bio-01-q05',
    isCorrect: true,
    source: '2d',
    occurredAt,
    recordedAt: occurredAt,
    ...extra,
  }) as LearningEvent

const e1 = event('e1', '2026-11-10T01:00:00.000Z')
const e2 = event('e2', '2026-11-10T02:00:00.000Z', { isCorrect: false })
const e3 = event('e3', '2026-11-10T03:00:00.000Z')
const store = (events: unknown[], version: unknown = 1) => JSON.stringify({ version, events })

// v1.1 §4.2 rules 2–4 and 7, and the audit's R1 (a newer save must never be wiped).
describe('parseEventStore', () => {
  it('starts empty and writable when nothing is saved', () => {
    expect(parseEventStore(null)).toEqual({ events: [], writable: true })
  })

  it('reads saved events in time order', () => {
    expect(parseEventStore(store([e2, e1]))).toEqual({ events: [e1, e2], writable: true })
  })

  // Corrupt data is ours to replace (as with saved progress); there is nothing to keep.
  it.each([
    ['broken JSON', '{nope'],
    ['not an object', '[]'],
    ['no version', JSON.stringify({ events: [e1] })],
  ])('treats %s as empty and writable', (_, text) => {
    expect(parseEventStore(text)).toEqual({ events: [], writable: true })
  })

  // A newer app wrote this; an old tab must not overwrite it with its own format.
  it('reads a newer version as nothing, and refuses to write over it', () => {
    expect(parseEventStore(store([e1], 2))).toEqual({ events: [], writable: false })
  })

  it('drops only the bad events', () => {
    const bad = [
      { ...e2, id: '' },
      { ...e2, eventType: 'cheated' },
      { ...e2, source: 'vr' },
      { ...e2, occurredAt: 'yesterday' },
      { ...e2, recordedAt: undefined },
      { ...e2, knowledgeIds: 'b-nucleus' },
      { ...e2, isCorrect: 'yes' },
      { ...e2, attemptNumber: 0 },
      { ...e2, durationMs: -1 },
      { ...e2, playerId: undefined },
      'e2',
    ]
    expect(parseEventStore(store([e1, ...bad, e3])).events).toEqual([e1, e3])
  })

  // quiz_started / quiz_completed are about a whole quiz, not particular points.
  it('accepts events with no knowledge points or optional fields', () => {
    const started = event('s', '2026-11-10T00:00:00.000Z', {
      eventType: 'quiz_started',
      knowledgeIds: [],
      questionId: undefined,
      isCorrect: undefined,
      activityId: 'quiz:bio-01',
    })
    expect(parseEventStore(store([started])).events).toEqual([started])
  })

  // Rule 7: a resent event is counted once; events never change, so the first copy wins.
  it('keeps one copy of a repeated id', () => {
    const resent = { ...e1, isCorrect: false }
    expect(parseEventStore(store([e1, resent])).events).toEqual([e1])
  })
})

describe('mergeEvents', () => {
  // Two tabs each wrote their own events: both survive (rule 4: nothing is overwritten).
  it('is the union of both lists, by id, in time order', () => {
    expect(mergeEvents([e3, e1], [e2, e1])).toEqual([e1, e2, e3])
  })

  it('keeps the stored copy when an id comes again', () => {
    expect(mergeEvents([e1], [{ ...e1, isCorrect: false }])).toEqual([e1])
  })

  it('orders events at the same moment by id, so every tab agrees', () => {
    const b = event('b', e1.occurredAt)
    const a = event('a', e1.occurredAt)
    expect(mergeEvents([b], [a])).toEqual([a, b])
  })
})

describe('recordEvents (LocalStorage)', () => {
  const saved = () => readEventStorage()

  it('adds events to what is saved', () => {
    expect(recordEvents([e1])).toBe(true)
    expect(recordEvents([e2])).toBe(true)
    expect(JSON.parse(saved()!)).toEqual({ version: 1, events: [e1, e2] })
  })

  // Another tab wrote e3 since this one loaded: re-read before writing, never clobber.
  it('keeps events another tab saved in the meantime', () => {
    localStorage.setItem(EVENTS_KEY, store([e3]))
    recordEvents([e1])
    expect(JSON.parse(saved()!).events).toEqual([e1, e3])
  })

  it('does not save the same event twice', () => {
    recordEvents([e1])
    recordEvents([e1])
    expect(JSON.parse(saved()!).events).toEqual([e1])
  })

  it('leaves a newer version untouched', () => {
    const newer = store([e1], 2)
    localStorage.setItem(EVENTS_KEY, newer)
    expect(recordEvents([e2])).toBe(false)
    expect(saved()).toBe(newer)
  })

  it('never touches saved progress', () => {
    localStorage.setItem('bio-quest:progress', '{"version":1}')
    recordEvents([e1])
    expect(localStorage.getItem('bio-quest:progress')).toBe('{"version":1}')
  })

  // R3: storage full or disabled — the game goes on, as with saved progress.
  it('reports a failed write instead of throwing', () => {
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError')
    }
    try {
      expect(recordEvents([e1])).toBe(false)
    } finally {
      Storage.prototype.setItem = setItem
    }
  })
})
