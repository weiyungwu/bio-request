import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { getQuestionBank } from '@/data/questions'
import {
  isRetriedCorrect,
  type CourseProgress,
  type LearningRecord,
  type SavedProgress,
  type WrongQuestion,
} from '@/types/progress'
import { earnedBadgeIds, localDay } from '@/utils/achievements'
import {
  DAILY_QUIZ_EXP_CAP,
  FIRST_CLEAR_EXP,
  REVIEW_EXP,
  quizScoreExp,
  type QuizExpAward,
} from '@/utils/exp'
import { levelFromExp } from '@/utils/level'
import {
  STORAGE_KEY,
  clearStorage,
  emptyProgress,
  parseProgress,
  readStorage,
  writeStorage,
} from '@/utils/progressStorage'
import { isPassing } from '@/utils/quiz'

const RECENT_LIMIT = 3

/** Learning progress (spec FR-08), loaded from and saved to LocalStorage (TASK-013). */
export const useProgressStore = defineStore('progress', () => {
  const saved = parseProgress(readStorage())
  const exp = ref(saved.exp)
  const records = ref<LearningRecord[]>(saved.records)
  const courseProgress = ref<Record<string, CourseProgress>>(saved.courseProgress)
  const wrongQuestions = ref<Record<string, WrongQuestion>>(saved.wrongQuestions)
  const badges = ref<string[]>(saved.badges)
  const claimed = ref<string[]>(saved.claimed)

  const snapshot = (): SavedProgress => ({
    version: 1,
    exp: exp.value,
    records: records.value,
    courseProgress: courseProgress.value,
    wrongQuestions: wrongQuestions.value,
    badges: badges.value,
    claimed: claimed.value,
  })
  // Every change is saved; a failed write (private mode, quota) keeps the session working.
  watch(snapshot, (data) => writeStorage(data), { deep: true })

  function apply(data: SavedProgress) {
    exp.value = data.exp
    records.value = data.records
    courseProgress.value = data.courseProgress
    wrongQuestions.value = data.wrongQuestions
    badges.value = data.badges
    claimed.value = data.claimed
  }
  // Another tab saved (or reset): adopt it, so this tab's next save can't write back stale
  // progress or undo a confirmed reset (TASK-013 review I1). The browser fires `storage`
  // only in other tabs and only for a changed value, so the echo save causes no loop.
  globalThis.addEventListener?.('storage', (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) apply(parseProgress(e.newValue))
  })

  const levelInfo = computed(() => levelFromExp(exp.value))
  /**
   * Wrong questions the 錯題本 can show: their question is still in its stage's bank.
   * Counting only these keeps 待複習 reachable (TASK-014 review S1).
   */
  const reviewable = computed(() =>
    Object.values(wrongQuestions.value).flatMap((entry) => {
      const question = getQuestionBank(entry.courseId)?.questions.find(
        (q) => q.id === entry.questionId,
      )
      return question ? [{ entry, question }] : []
    }),
  )
  const toReviewCount = computed(() => reviewable.value.filter((r) => !r.entry.mastered).length)
  const latestRecords = computed(() =>
    records.value
      .map((record) => ({ record, time: Date.parse(record.completedAt) }))
      .filter(({ time }) => !Number.isNaN(time))
      .sort((a, b) => b.time - a.time)
      .slice(0, RECENT_LIMIT)
      .map(({ record }) => record),
  )

  /**
   * Pays a first-time reward once (docs/progression.md §2: 每單元／每遊戲／每關首次).
   * Returns the EXP paid: `amount` the first time, 0 after.
   */
  function claim(key: string, amount: number): number {
    if (claimed.value.includes(key)) return 0
    claimed.value.push(key)
    exp.value += amount
    return amount
  }

  /** Adds badges whose condition is now met; each badge is given once (TASK-015). */
  function awardBadges(): string[] {
    const fresh = earnedBadgeIds(courseProgress.value, records.value).filter(
      (id) => !badges.value.includes(id),
    )
    badges.value.push(...fresh)
    return fresh
  }

  /** Quiz-score EXP already paid on the local day of `now` (§3 每日上限). */
  function quizExpOn(now: Date): number {
    const day = localDay(now)
    return records.value
      .filter((r) => localDay(new Date(r.completedAt)) === day)
      .reduce((sum, r) => sum + (r.exp ?? 0), 0)
  }

  /**
   * Records one finished quiz (TASK-012/013/015): best/latest score, cleared status, activity
   * log, the questions answered wrong, EXP (quiz reward capped per day; first clear once per
   * stage, never on a replay) and any badge first earned.
   */
  function recordQuizResult(
    courseId: string,
    score: number,
    wrongIds: readonly string[] = [],
    now = new Date(),
  ): QuizExpAward {
    const prev = courseProgress.value[courseId]
    const passed = isPassing(score)
    const full = quizScoreExp(score)
    // If the reward would pass today's cap, only the remainder is paid (§3).
    const quiz = Math.min(full, Math.max(0, DAILY_QUIZ_EXP_CAP - quizExpOn(now)))
    const firstClear = passed && !prev?.completed ? FIRST_CLEAR_EXP : 0
    const at = now.toISOString()
    courseProgress.value[courseId] = {
      courseId,
      completed: (prev?.completed ?? false) || passed,
      bestScore: Math.max(prev?.bestScore ?? 0, score),
      latestScore: score,
    }
    records.value.push({ courseId, score, passed, completedAt: at, exp: quiz })
    // A new mistake puts the question back on the list even if it was marked 熟悉.
    for (const questionId of wrongIds) {
      wrongQuestions.value[questionId] = { questionId, courseId, lastWrongAt: at, mastered: false }
    }
    exp.value += quiz + firstClear
    return {
      quiz,
      capped: quiz < full,
      firstClear,
      total: quiz + firstClear,
      newBadges: awardBadges(),
    }
  }

  /**
   * A retry in the 錯題本 (TASK-014). Right: remembered as 重新答對. Wrong: back to 待複習,
   * the same as a mistake in a quiz.
   */
  function recordReviewAnswer(questionId: string, correct: boolean, now = new Date()): number {
    const entry = wrongQuestions.value[questionId]
    if (!entry) return 0
    if (!correct) {
      Object.assign(entry, { lastWrongAt: now.toISOString(), mastered: false })
      return 0
    }
    entry.lastCorrectAt = now.toISOString()
    // 完成錯題補強 (Human decision): every wrong question of the stage re-answered right →
    // +10 once per stage. 標記已熟悉 without a correct retry doesn't count (§3 重新答對才給).
    const stage = reviewable.value.filter((r) => r.entry.courseId === entry.courseId)
    return stage.every((r) => isRetriedCorrect(r.entry))
      ? claim(`review:${entry.courseId}`, REVIEW_EXP)
      : 0
  }

  /** 標記已熟悉 / 取消 (TASK-014). */
  function setMastered(questionId: string, mastered: boolean) {
    const entry = wrongQuestions.value[questionId]
    if (entry) entry.mastered = mastered
  }

  /** 重設學習資料 (spec TASK-013); the page asks the student to confirm first. */
  function resetAll() {
    apply(emptyProgress())
    clearStorage()
  }

  return {
    exp,
    records,
    courseProgress,
    wrongQuestions,
    badges,
    claimed,
    levelInfo,
    latestRecords,
    reviewable,
    toReviewCount,
    recordQuizResult,
    recordReviewAnswer,
    claim,
    setMastered,
    resetAll,
  }
})
