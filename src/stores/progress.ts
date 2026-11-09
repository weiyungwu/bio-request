import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { CourseProgress, LearningRecord, SavedProgress, WrongQuestion } from '@/types/progress'
import { getQuestionBank } from '@/data/questions'
import { FIRST_CLEAR_EXP, quizScoreExp, type QuizExpAward } from '@/utils/exp'
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

  const snapshot = (): SavedProgress => ({
    version: 1,
    exp: exp.value,
    records: records.value,
    courseProgress: courseProgress.value,
    wrongQuestions: wrongQuestions.value,
    badges: badges.value,
  })
  // Every change is saved; a failed write (private mode, quota) keeps the session working.
  watch(snapshot, (data) => writeStorage(data), { deep: true })

  function apply(data: SavedProgress) {
    exp.value = data.exp
    records.value = data.records
    courseProgress.value = data.courseProgress
    wrongQuestions.value = data.wrongQuestions
    badges.value = data.badges
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
   * Records one finished quiz (TASK-012/013): best/latest score, cleared status, activity
   * log, EXP and the questions answered wrong. The first-clear bonus is paid once per
   * stage, never on a replay.
   */
  function recordQuizResult(
    courseId: string,
    score: number,
    wrongIds: readonly string[] = [],
    now = new Date(),
  ): QuizExpAward {
    const prev = courseProgress.value[courseId]
    const passed = isPassing(score)
    const quiz = quizScoreExp(score)
    const firstClear = passed && !prev?.completed ? FIRST_CLEAR_EXP : 0
    const at = now.toISOString()
    courseProgress.value[courseId] = {
      courseId,
      completed: (prev?.completed ?? false) || passed,
      bestScore: Math.max(prev?.bestScore ?? 0, score),
      latestScore: score,
    }
    records.value.push({ courseId, score, passed, completedAt: at })
    // A new mistake puts the question back on the list even if it was marked 熟悉.
    for (const questionId of wrongIds) {
      wrongQuestions.value[questionId] = { questionId, courseId, lastWrongAt: at, mastered: false }
    }
    exp.value += quiz + firstClear
    return { quiz, firstClear, total: quiz + firstClear }
  }

  /**
   * A retry in the 錯題本 (TASK-014). Right: remembered as 重新答對. Wrong: back to 待複習,
   * the same as a mistake in a quiz.
   */
  function recordReviewAnswer(questionId: string, correct: boolean, now = new Date()) {
    const entry = wrongQuestions.value[questionId]
    if (!entry) return
    if (correct) entry.lastCorrectAt = now.toISOString()
    else Object.assign(entry, { lastWrongAt: now.toISOString(), mastered: false })
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
    levelInfo,
    latestRecords,
    reviewable,
    toReviewCount,
    recordQuizResult,
    recordReviewAnswer,
    setMastered,
    resetAll,
  }
})
