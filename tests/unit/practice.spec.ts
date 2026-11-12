import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { getLessonData } from '@/data/lessons'
import { getQuestionBank } from '@/data/questions'
import { useProgressStore } from '@/stores/progress'
import type { LearningEvent } from '@/types/learningEvent'
import { courseReport, type CourseReport } from '@/utils/knowledgeReport'
import { PRACTICE_SIZE, drawPractice, practiceTargets } from '@/utils/practice'
import { PRACTICE_HISTORY_LIMIT, STORAGE_KEY, parseProgress } from '@/utils/progressStorage'
import { QUIZ_MAX_HARD } from '@/utils/quiz'

// v1.1 Phase 2 弱點練習: practice what the student is weak at, not a random stage quiz.
const lesson = getLessonData('bio-01')!
const questions = getQuestionBank('bio-01')!.questions
const PLAYER = 'p1'
const now = new Date('2026-11-12T12:00:00Z')
let n = 0

function answer(questionId: string, correct: boolean, playerId = PLAYER): LearningEvent {
  const at = new Date(Date.UTC(2026, 10, 10, 0, 0, n++)).toISOString()
  return {
    id: `e${n}`,
    playerId,
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
const report = (events: LearningEvent[]): CourseReport =>
  courseReport(lesson, questions, events, { playerId: PLAYER, now })
const about = (id: string) => questions.filter((q) => q.knowledgeIds.includes(id))
const only = (id: string) =>
  questions.filter((q) => q.knowledgeIds.length === 1 && q.knowledgeIds[0] === id)

describe('practiceTargets', () => {
  it('practises the weak points the report names', () => {
    const [a, b, c] = only('a-response')
    const r = report([answer(a!.id, false), answer(b!.id, false), answer(c!.id, false)])
    expect(practiceTargets(r).map((p) => p.id)).toEqual(r.weakest.map((p) => p.id))
    expect(practiceTargets(r)[0]!.id).toBe('a-response')
  })

  // A first-time student has no weak points yet: start in lesson order.
  it('with no answers yet, takes the first points in lesson order', () => {
    const r = report([])
    expect(practiceTargets(r).map((p) => p.id)).toEqual(
      r.units
        .flatMap((u) => u.points)
        .slice(0, 3)
        .map((p) => p.id),
    )
  })

  // §20 5.4: 已學習但尚未達到 Mastery before 尚未開始. After one quiz nothing is weak yet
  // (fewer than 3 answers a point), but the points just answered wrong come first, so the
  // practice confirms them instead of moving on to points never seen.
  it('with no weak points, takes answered points not yet mastered, lowest accuracy first', () => {
    const last = lesson.lessons.flatMap((l) => l.knowledgePoints).reverse()[0]!.id
    const r = report([
      answer(only(last)[0]!.id, false),
      answer(only('a-response')[0]!.id, true),
      answer(only('a-metabolism')[0]!.id, false),
      answer(only('a-metabolism')[1]!.id, true),
    ])
    expect(r.weakest).toEqual([])
    // 0% (last), 50%, 100%: every answered point before the unanswered ones.
    expect(practiceTargets(r).map((p) => p.id)).toEqual([last, 'a-metabolism', 'a-response'])
    // With one answered point, the rest come from the unanswered in lesson order.
    const one = report([answer(only(last)[0]!.id, false)])
    expect(practiceTargets(one).map((p) => p.id)).toEqual([
      last,
      ...one.units
        .flatMap((u) => u.points)
        .slice(0, 2)
        .map((p) => p.id),
    ])
  })

  it('still offers practice when every point is mastered', () => {
    const r = report([])
    const points = r.units.flatMap((u) => u.points)
    for (const p of points)
      Object.assign(p.mastery, { masteryLevel: 'mastered', recentAccuracy: 1 })
    // The least secure mastered points come first.
    Object.assign(points[5]!.mastery, { recentAccuracy: 0.8 })
    Object.assign(points[9]!.mastery, { recentAccuracy: 0.8 })
    Object.assign(points[2]!.mastery, { recentAccuracy: 0.9 })
    expect(practiceTargets(r).map((p) => p.id)).toEqual([
      points[5]!.id,
      points[9]!.id,
      points[2]!.id,
    ])
  })
})

describe('drawPractice', () => {
  const targets = (ids: string[]) => {
    const points = report([]).units.flatMap((u) => u.points)
    return ids.map((id) => points.find((p) => p.id === id)!)
  }

  it('draws 5 distinct questions spread over every target point', () => {
    const t = targets(['a-response', 'b-vacuole', 'd-active'])
    for (let k = 0; k < 50; k++) {
      const qs = drawPractice(t, questions, [], PLAYER)
      expect(new Set(qs.map((q) => q.id)).size).toBe(PRACTICE_SIZE)
      for (const p of t) expect(qs.some((q) => q.knowledgeIds.includes(p.id))).toBe(true)
      expect(qs.every((q) => t.some((p) => q.knowledgeIds.includes(p.id)))).toBe(true)
      expect(qs.filter((q) => q.difficulty === 'hard').length).toBeLessThanOrEqual(QUIZ_MAX_HARD)
    }
  })

  // Practice should bring new questions, then mistakes, before repeating what was right.
  it('prefers unanswered questions, then ones last answered wrong', () => {
    const pool = about('b-vacuole')
    const right = pool.slice(0, -2)
    const wrong = pool[pool.length - 2]!
    const fresh = pool[pool.length - 1]!
    const events = [...right.map((q) => answer(q.id, true)), answer(wrong.id, false)]
    // A random 5 of these 9 would hold both only 28% of the time; 20 draws rule out luck.
    for (let k = 0; k < 20; k++) {
      const qs = drawPractice(targets(['b-vacuole']), pool, events, PLAYER).map((q) => q.id)
      expect(qs).toContain(fresh.id)
      expect(qs).toContain(wrong.id)
    }
  })

  it("only this player's answers count as answered", () => {
    const pool = about('b-vacuole')
    const events = pool.slice(0, -1).map((q) => answer(q.id, true, 'someone-else'))
    const draws = new Set<string>()
    for (let k = 0; k < 30; k++)
      for (const q of drawPractice(targets(['b-vacuole']), pool, events, PLAYER)) draws.add(q.id)
    expect(draws.size).toBeGreaterThan(PRACTICE_SIZE)
  })

  it('returns what there is when the points have fewer than 5 questions', () => {
    const pool = about('b-vacuole').slice(0, 2)
    expect(drawPractice(targets(['b-vacuole']), pool, [], PLAYER)).toHaveLength(2)
  })
})

describe('recordPracticeResult', () => {
  const reload = () => {
    setActivePinia(createPinia())
    return useProgressStore()
  }
  const day = (h: number) => new Date(2026, 10, 10, h)

  // Human decision: EXP as a quiz score, within the daily cap shared with stage quizzes.
  it('pays quiz-score EXP within the daily cap it shares with stage quizzes', () => {
    const p = reload()
    expect(p.recordPracticeResult('bio-01', 100, [], day(8))).toMatchObject({
      quiz: 40,
      capped: false,
    })
    p.recordQuizResult('bio-01', 100, [], day(9)) // 40 quiz + 30 first clear
    expect(p.recordPracticeResult('bio-01', 100, [], day(10))).toMatchObject({
      quiz: 20,
      capped: true,
    })
    expect(p.recordQuizResult('bio-01', 100, [], day(11)).quiz).toBe(0)
    expect(p.recordPracticeResult('bio-01', 50, [], day(12))).toEqual({
      quiz: 0,
      capped: false,
      firstClear: 0,
      total: 0,
      newBadges: [],
    })
    expect(p.exp).toBe(130)
  })

  // Not a stage attempt: no best score, 最近學習紀錄, clear or badge from practice.
  it('leaves stage progress, records and badges alone', () => {
    const p = reload()
    p.recordPracticeResult('bio-01', 100, [], day(8))
    expect(p.records).toEqual([])
    expect(p.courseProgress).toEqual({})
    expect(p.badges).toEqual([])
  })

  // Human decision: practice mistakes go to the 錯題本, back to 待複習 even if 熟悉.
  it('puts wrong answers on the 錯題本', () => {
    const p = reload()
    p.recordQuizResult('bio-01', 80, ['bio-01-q01'], day(8))
    p.setMastered('bio-01-q01', true)
    p.recordPracticeResult('bio-01', 60, ['bio-01-q01', 'bio-01-q02'], day(9))
    expect(p.wrongQuestions['bio-01-q01']!.mastered).toBe(false)
    expect(p.wrongQuestions['bio-01-q02']).toMatchObject({ courseId: 'bio-01', mastered: false })
  })

  it('is saved, and an older save without practice still loads', async () => {
    const p = reload()
    p.recordPracticeResult('bio-01', 80, [], day(8))
    await nextTick()
    expect(reload().practice).toHaveLength(1)
    const old = { version: 1, exp: 5, records: [], courseProgress: {}, wrongQuestions: {} }
    expect(parseProgress(JSON.stringify(old)).practice).toEqual([])
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...old, practice: [{ score: 'x' }] }))
    expect(reload()).toMatchObject({ exp: 5, practice: [] })
  })

  // Trimming old history must not drop today's entries, which keep the daily cap.
  it("trims history to the limit but keeps today's entries", () => {
    const p = reload()
    for (let k = 0; k < PRACTICE_HISTORY_LIMIT; k++)
      p.recordPracticeResult('bio-01', 0, [], new Date(2026, 9, 1, 8, k))
    for (let k = 0; k < 3; k++) p.recordPracticeResult('bio-01', 100, [], day(8 + k))
    expect(p.practice).toHaveLength(PRACTICE_HISTORY_LIMIT)
    for (let k = 0; k < PRACTICE_HISTORY_LIMIT; k++)
      p.recordPracticeResult('bio-01', 0, [], day(12))
    expect(p.practice.length).toBeGreaterThan(PRACTICE_HISTORY_LIMIT)
    expect(p.recordPracticeResult('bio-01', 100, [], day(13)).quiz).toBe(0)
  })
})
