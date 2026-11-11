import { describe, it, expect } from 'vitest'
import { getLessonData } from '@/data/lessons'
import { getQuestionBank } from '@/data/questions'
import type { LearningEvent } from '@/types/learningEvent'
import { courseReport } from '@/utils/knowledgeReport'
import { MASTERY_RULES } from '@/utils/mastery'

// v1.1 §4.7 acceptance: 學習報表能指出具體弱點 Knowledge.
const lesson = getLessonData('bio-01')!
const questions = getQuestionBank('bio-01')!.questions
const PLAYER = 'p1'
const now = new Date('2026-11-12T12:00:00Z')
let n = 0

/** One answer to a real stage-1 question, tagged with that question's knowledge points. */
function answer(questionId: string, correct: boolean, day = 10): LearningEvent {
  const at = new Date(Date.UTC(2026, 10, day, 0, 0, n++)).toISOString()
  return {
    id: `e${n}`,
    playerId: PLAYER,
    sessionId: 's',
    eventType: 'question_answered',
    knowledgeIds: questions.find((q) => q.id === questionId)!.knowledgeIds,
    questionId,
    isCorrect: correct,
    source: '2d',
    occurredAt: at,
    recordedAt: at,
  }
}
const report = (events: LearningEvent[]) =>
  courseReport(lesson, questions, events, { playerId: PLAYER, now })
const point = (r: ReturnType<typeof report>, id: string) =>
  r.units.flatMap((u) => u.points).find((p) => p.id === id)!

describe('courseReport', () => {
  it('lists every knowledge point under its unit, in lesson order', () => {
    const r = report([])
    expect(r.units.map((u) => u.title)).toEqual(lesson.lessons.map((l) => l.title))
    expect(r.units.flatMap((u) => u.points.map((p) => p.id))).toEqual(
      lesson.lessons.flatMap((l) => l.knowledgePoints.map((k) => k.id)),
    )
    expect(point(r, 'b-nucleus')).toMatchObject({
      term: '細胞核',
      mastery: { masteryLevel: 'not_started', totalAttempts: 0 },
    })
    expect(r.weakest).toEqual([])
  })

  // Audit §6 point 7: with fewer than 5 different questions a point can't reach mastered,
  // so the page says why instead of leaving students stuck at 練習中.
  it('counts the questions per point and flags points with too few', () => {
    const r = report([])
    expect(point(r, 'b-cytoplasm')).toMatchObject({ questionCount: 3, enoughQuestions: false })
    // Batch 3 gave unit A 8+ questions a point.
    expect(point(r, 'a-growth')).toMatchObject({ questionCount: 9, enoughQuestions: true })
    // Every stage-1 point has questions now; a later stage starts with points that have none.
    const without = questions.filter((q) => !q.knowledgeIds.includes('a-growth'))
    const empty = courseReport(lesson, without, [], { playerId: PLAYER, now })
    expect(point(empty, 'a-growth')).toMatchObject({ questionCount: 0, enoughQuestions: false })
  })

  it('picks the answered points under 80%, lowest first, at most 3', () => {
    const events = [
      // q01 → a-response 0/2; q02 → a-metabolism 1/2; q06 → b-mitochondrion 2/3;
      // q04 → b-cytoplasm 1/1 (100%, not weak); q09 → c-plant, c-animal 0/1.
      answer('bio-01-q01', false),
      answer('bio-01-q01', false),
      answer('bio-01-q02', true),
      answer('bio-01-q02', false),
      answer('bio-01-q06', true),
      answer('bio-01-q06', true),
      answer('bio-01-q06', false),
      answer('bio-01-q04', true),
      answer('bio-01-q09', false),
    ]
    const r = report(events)
    // 0% ties (a-response, c-plant, c-animal): lesson order breaks them.
    expect(r.weakest.map((p) => p.id)).toEqual(['a-response', 'c-plant', 'c-animal'])
    expect(point(r, 'a-metabolism').mastery.accuracy).toBe(0.5)
    expect(r.weakest.every((p) => p.mastery.accuracy < 0.8)).toBe(true)
  })

  // Review I1: weak means weak now (the latest answers), as mastery is judged. A student who
  // recovered must not be told 需要加強 next to ⭐ 已精熟; one who slipped must be.
  it('judges weakness by the latest answers, and never lists a mastered point', () => {
    // Stage-1 points have at most 3 questions, so lower the variety thresholds to let
    // b-mitochondrion (q06, q08, q12) reach mastered.
    const rules = { ...MASTERY_RULES, minQuestions: 3, recentMinQuestions: 3 }
    const qs = ['bio-01-q06', 'bio-01-q08', 'bio-01-q12', 'bio-01-q06', 'bio-01-q08']
    const recovered = [
      ...qs.map((q) => answer(q, false, 10)),
      ...qs.map((q) => answer(q, true, 11)),
    ]
    const r = courseReport(lesson, questions, recovered, { playerId: PLAYER, now, rules })
    expect(point(r, 'b-mitochondrion').mastery).toMatchObject({
      masteryLevel: 'mastered',
      accuracy: 0.5,
    })
    expect(r.weakest.map((p) => p.id)).not.toContain('b-mitochondrion')

    // 7 of 10 overall, but 2 of the last 5 (q01 tests only a-response).
    const slipped = [
      ...Array.from({ length: 5 }, () => answer('bio-01-q01', true, 10)),
      ...[true, true, false, false, false].map((c) => answer('bio-01-q01', c, 11)),
    ]
    const s = report(slipped)
    expect(point(s, 'a-response').mastery).toMatchObject({ accuracy: 0.7, recentAccuracy: 0.4 })
    expect(s.weakest.map((p) => p.id)).toEqual(['a-response'])
  })

  it('never calls an unanswered point weak', () => {
    const r = report([answer('bio-01-q04', true)])
    expect(r.weakest).toEqual([])
  })
})
