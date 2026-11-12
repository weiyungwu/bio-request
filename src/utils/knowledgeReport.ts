import type { LearningEvent } from '@/types/learningEvent'
import type { LessonData } from '@/types/lesson'
import type { KnowledgeMastery } from '@/types/mastery'
import type { Question } from '@/types/question'
import {
  MASTERY_RULES,
  knowledgeMastery,
  type MasteryOptions,
  type MasteryRules,
} from '@/utils/mastery'

export interface PointReport {
  id: string
  /** 正式學科名詞 (zh). */
  term: string
  mastery: KnowledgeMastery
  /** Questions in the bank that test this point. */
  questionCount: number
  /** Enough different questions to reach mastered (audit §6 point 7). */
  enoughQuestions: boolean
}

export interface CourseReport {
  units: { id: string; title: string; points: PointReport[] }[]
  /**
   * Not yet mastered points answered at least `practicingFrom` times whose latest answers are
   * under the mastered accuracy, lowest first (v1.1 §4.7 弱點). Judged on the same window as
   * mastery, so a student who has recovered is not still told 需要加強, and one who slipped is.
   * Fewer answers are not enough to call a point weak (§20 5.5: 不得將單次偶發錯誤直接視為能力不足).
   */
  weakest: PointReport[]
}

/** How many weak points the report names; more would read as a list, not a focus. */
export const WEAK_LIMIT = 3

/** One stage's knowledge points with mastery, grouped by unit, plus its weakest points. */
export function courseReport(
  lesson: LessonData,
  questions: readonly Question[],
  events: readonly LearningEvent[],
  options: MasteryOptions,
): CourseReport {
  const rules = options.rules ?? MASTERY_RULES
  const units = lesson.lessons.map((unit) => ({
    id: unit.id,
    title: unit.title,
    points: unit.knowledgePoints.map((k): PointReport => {
      const questionCount = questions.filter((q) => q.knowledgeIds.includes(k.id)).length
      return {
        id: k.id,
        term: k.term.zh,
        mastery: knowledgeMastery(events, k.id, options),
        questionCount,
        enoughQuestions: questionCount >= rules.minQuestions,
      }
    }),
  }))
  // Stable sort: equal accuracy keeps lesson order.
  const weakest = units
    .flatMap((u) => u.points)
    .filter(
      ({ mastery: m }) =>
        m.totalAttempts >= rules.practicingFrom &&
        m.masteryLevel !== 'mastered' &&
        m.recentAccuracy < rules.recentAccuracy,
    )
    .sort((a, b) => a.mastery.recentAccuracy - b.mastery.recentAccuracy)
    .slice(0, WEAK_LIMIT)
  return { units, weakest }
}

/**
 * Why a point is suggested, from its answers (§20 5.4: 推薦結果必須顯示原因, never just
 * "系統推薦你練習"). Counts are over the same latest answers mastery is judged on.
 */
export function pointReason(
  mastery: KnowledgeMastery,
  rules: MasteryRules = MASTERY_RULES,
): string {
  const total = mastery.totalAttempts
  if (total === 0) return '還沒作答過'
  const recent = Math.min(total, rules.recentWindow)
  // recentAccuracy is right / recent, so this is exact.
  const right = Math.round(mastery.recentAccuracy * recent)
  if (total < rules.practicingFrom)
    return `只答過 ${total} 次（答對 ${right} 次），多練幾題才看得出程度`
  if (mastery.masteryLevel === 'mastered') return `已精熟，最近 ${recent} 次答對 ${right} 次`
  if (mastery.recentAccuracy < rules.recentAccuracy)
    return `最近 ${recent} 次答錯 ${recent - right} 次`
  return `最近 ${recent} 次答對 ${right} 次，還沒達到精熟`
}
