import { describe, it, expect } from 'vitest'
import { getLessonData } from '@/data/lessons'
import { getQuestionBank } from '@/data/questions'
import type { LearningEvent } from '@/types/learningEvent'
import { courseReport, pointReason } from '@/utils/knowledgeReport'
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
    // Real stage-1 points have enough questions once batch 3 is in; trim one to 3 on purpose,
    // so the case doesn't depend on how far the batches have got.
    const growth = questions.filter((q) => q.knowledgeIds.includes('a-growth'))
    const trimmed = questions.filter((q) => !growth.slice(3).includes(q))
    const few = courseReport(lesson, trimmed, [], { playerId: PLAYER, now })
    expect(point(few, 'a-growth')).toMatchObject({ questionCount: 3, enoughQuestions: false })
    const r = report([])
    expect(point(r, 'a-growth').enoughQuestions).toBe(true)
    // Every stage-1 point has questions now; a later stage starts with points that have none.
    const without = questions.filter((q) => !q.knowledgeIds.includes('a-growth'))
    const empty = courseReport(lesson, without, [], { playerId: PLAYER, now })
    expect(point(empty, 'a-growth')).toMatchObject({ questionCount: 0, enoughQuestions: false })
  })

  it('picks the points under 80% answered at least 3 times, lowest first, at most 3', () => {
    const events = [
      // q01 → a-response 0/3; q02 → a-metabolism 1/3; q06 → b-mitochondrion 2/3;
      // q04 → b-cytoplasm 3/3 (100%, not weak); q09 → c-plant, c-animal 0/1 (too few).
      ...[false, false, false].map((c) => answer('bio-01-q01', c)),
      ...[true, false, false].map((c) => answer('bio-01-q02', c)),
      ...[true, true, false].map((c) => answer('bio-01-q06', c)),
      ...[true, true, true].map((c) => answer('bio-01-q04', c)),
      answer('bio-01-q09', false),
    ]
    const r = report(events)
    expect(r.weakest.map((p) => p.id)).toEqual(['a-response', 'a-metabolism', 'b-mitochondrion'])
    expect(r.weakest.every((p) => p.mastery.recentAccuracy < 0.8)).toBe(true)
  })

  // SPEC v1.1 §20 5.5: 不得將單次偶發錯誤直接視為能力不足. One quiz gives a point one or two
  // answers; calling it 需要加強 from that would label a slip as a weakness.
  it('does not call a point weak on fewer than 3 answers, however wrong', () => {
    const r = report([
      answer('bio-01-q01', false),
      answer('bio-01-q01', false),
      answer('bio-01-q09', false),
    ])
    expect(point(r, 'a-response').mastery.recentAccuracy).toBe(0)
    expect(r.weakest).toEqual([])
    // The third wrong answer is a pattern, not a slip.
    const again = report(Array.from({ length: 3 }, () => answer('bio-01-q01', false)))
    expect(again.weakest.map((p) => p.id)).toEqual(['a-response'])
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

// SPEC v1.1 §20 5.4: 推薦結果必須顯示原因, with the counts behind it, never only
// "系統推薦你練習".
describe('pointReason', () => {
  const reasonOf = (events: LearningEvent[], id: string) =>
    pointReason(point(report(events), id).mastery)

  it('says a point has not been answered yet', () => {
    expect(reasonOf([], 'a-response')).toBe('還沒作答過')
  })

  it('says too few answers to tell, with the count', () => {
    expect(reasonOf([answer('bio-01-q01', false)], 'a-response')).toBe(
      '只答過 1 次（答對 0 次），多練幾題才看得出程度',
    )
  })

  it('counts the mistakes among the latest answers for a weak point', () => {
    // 7 answers, the latest 5 have 3 wrong: older answers don't count.
    const events = [true, true, true, false, true, false, false].map((c) => answer('bio-01-q01', c))
    expect(reasonOf(events, 'a-response')).toBe('最近 5 次答錯 3 次')
  })

  it('says a point answered well is not yet mastered', () => {
    // All right but on one day: not mastered yet (needs 2 days).
    const events = [true, true, true, true].map((c) => answer('bio-01-q01', c))
    expect(reasonOf(events, 'a-response')).toBe('最近 4 次答對 4 次，還沒達到精熟')
  })

  it('says a mastered point is mastered', () => {
    const r = report([])
    const m = point(r, 'a-response').mastery
    Object.assign(m, { totalAttempts: 9, recentAccuracy: 0.8, masteryLevel: 'mastered' })
    expect(pointReason(m)).toBe('已精熟，最近 5 次答對 4 次')
  })
})
