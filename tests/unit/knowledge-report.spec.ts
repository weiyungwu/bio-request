import { describe, it, expect } from 'vitest'
import { getLessonData } from '@/data/lessons'
import { getQuestionBank } from '@/data/questions'
import type { LearningEvent } from '@/types/learningEvent'
import { courseReport } from '@/utils/knowledgeReport'

// v1.1 §4.7 acceptance: 學習報表能指出具體弱點 Knowledge.
const lesson = getLessonData('bio-01')!
const questions = getQuestionBank('bio-01')!.questions
const PLAYER = 'p1'
const now = new Date('2026-11-12T12:00:00Z')
let n = 0

/** One answer to a real stage-1 question, tagged with that question's knowledge points. */
function answer(questionId: string, correct: boolean): LearningEvent {
  const at = new Date(Date.UTC(2026, 10, 10, 0, 0, n++)).toISOString()
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
    expect(point(r, 'a-growth')).toMatchObject({ questionCount: 0, enoughQuestions: false })
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

  it('never calls an unanswered point weak', () => {
    const r = report([answer('bio-01-q04', true)])
    expect(r.weakest).toEqual([])
  })
})
