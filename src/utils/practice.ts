import type { LearningEvent } from '@/types/learningEvent'
import type { Question } from '@/types/question'
import type { CourseReport, PointReport } from '@/utils/knowledgeReport'
import { QUIZ_MAX_HARD, QUIZ_SIZE } from '@/utils/quiz'
import { shuffle } from '@/utils/shuffle'

/**
 * 弱點練習 (v1.1 Phase 2 adaptive practice). Human decisions (2026-11-11): 5 questions,
 * wrong answers go to the 錯題本, EXP as a quiz score within the shared daily cap.
 */
export const PRACTICE_SIZE = QUIZ_SIZE
/** Points one practice focuses on; the same as the weak points the report names. */
export const PRACTICE_POINTS = 3

/**
 * The points to practise: the report's weak points; with none, the points not yet mastered,
 * answered ones first (§20 5.4: 已學習但尚未達到 Mastery; an unanswered point is 尚未開始, for
 * which the lesson comes first), lowest recent accuracy first, then the fewest answers, so a
 * point answered wrong too few times to be called weak is practised before the rest; when all
 * are mastered, the lowest recent accuracy, so practice is always possible.
 */
export function practiceTargets(report: CourseReport): PointReport[] {
  if (report.weakest.length > 0) return report.weakest.slice(0, PRACTICE_POINTS)
  const points = report.units.flatMap((u) => u.points).filter((p) => p.questionCount > 0)
  const open = points.filter((p) => p.mastery.masteryLevel !== 'mastered')
  const unanswered = (p: PointReport) => (p.mastery.totalAttempts === 0 ? 1 : 0)
  // Stable sorts: ties keep lesson order.
  const ranked =
    open.length > 0
      ? [...open].sort(
          (a, b) =>
            unanswered(a) - unanswered(b) ||
            a.mastery.recentAccuracy - b.mastery.recentAccuracy ||
            a.mastery.totalAttempts - b.mastery.totalAttempts,
        )
      : [...points].sort((a, b) => a.mastery.recentAccuracy - b.mastery.recentAccuracy)
  return ranked.slice(0, PRACTICE_POINTS)
}

/** 0 never answered, 1 last answered wrong, 2 last answered right: lower comes first. */
function priorities(events: readonly LearningEvent[], playerId: string): Map<string, number> {
  const last = new Map<string, number>()
  // Events are kept oldest first; a later answer replaces an earlier one.
  for (const e of events)
    if (
      e.eventType === 'question_answered' &&
      e.playerId === playerId &&
      e.questionId !== undefined &&
      typeof e.isCorrect === 'boolean'
    )
      last.set(e.questionId, e.isCorrect ? 2 : 1)
  return last
}

/**
 * Up to PRACTICE_SIZE distinct questions spread over the target points in turn. Each point
 * takes its unanswered questions first, then those last answered wrong, then the rest
 * (random within each group). At most QUIZ_MAX_HARD are hard unless nothing else is left;
 * the cap wins over priority, so once it is reached an unanswered hard question waits while
 * an easier one already answered right is picked. Mistakes come after new questions: the
 * 錯題本 already brings them back. Fewer than PRACTICE_SIZE when the points have fewer
 * questions; none with no targets, which the page must handle.
 */
export function drawPractice(
  targets: readonly PointReport[],
  questions: readonly Question[],
  events: readonly LearningEvent[],
  playerId: string,
  random: () => number = Math.random,
): Question[] {
  const seen = priorities(events, playerId)
  const rank = (q: Question) => seen.get(q.id) ?? 0
  const queues = targets.map((t) =>
    // shuffle, then a stable sort: random within the same priority.
    shuffle(
      questions.filter((q) => q.knowledgeIds.includes(t.id)),
      random,
    ).sort((a, b) => rank(a) - rank(b)),
  )
  const picked: Question[] = []
  const fill = (allowHard: (hard: number) => boolean) => {
    let progress = true
    while (picked.length < PRACTICE_SIZE && progress) {
      progress = false
      for (const queue of queues) {
        if (picked.length >= PRACTICE_SIZE) break
        const hard = picked.filter((q) => q.difficulty === 'hard').length
        const next = queue.find(
          (q) => !picked.includes(q) && (q.difficulty !== 'hard' || allowHard(hard)),
        )
        if (next) {
          picked.push(next)
          progress = true
        }
      }
    }
  }
  fill((hard) => hard < QUIZ_MAX_HARD)
  // Too few other questions: a full practice matters more than the cap (as drawQuestions).
  fill(() => true)
  return shuffle(picked, random)
}
