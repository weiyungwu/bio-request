import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { CourseProgress, LearningRecord, SavedProgress, WrongQuestion } from '@/types/progress'
import { FIRST_CLEAR_EXP, quizScoreExp, type QuizExpAward } from '@/utils/exp'
import { levelFromExp } from '@/utils/level'
import {
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

  const levelInfo = computed(() => levelFromExp(exp.value))
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

  /** 重設學習資料 (spec TASK-013); the page asks the student to confirm first. */
  function resetAll() {
    const empty = emptyProgress()
    exp.value = empty.exp
    records.value = empty.records
    courseProgress.value = empty.courseProgress
    wrongQuestions.value = empty.wrongQuestions
    badges.value = empty.badges
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
    recordQuizResult,
    resetAll,
  }
})
