import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CourseProgress, LearningRecord } from '@/types/progress'
import { FIRST_CLEAR_EXP, quizScoreExp, type QuizExpAward } from '@/utils/exp'
import { levelFromExp } from '@/utils/level'
import { isPassing } from '@/utils/quiz'

const RECENT_LIMIT = 3

// In-memory only for now; LocalStorage persistence is TASK-013.
export const useProgressStore = defineStore('progress', () => {
  const exp = ref(0)
  const records = ref<LearningRecord[]>([])
  const courseProgress = ref<Record<string, CourseProgress>>({})

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
   * Records one finished quiz (TASK-012): best/latest score, cleared status, activity
   * log and EXP. The first-clear bonus is paid once per stage, never on a replay.
   */
  function recordQuizResult(courseId: string, score: number, now = new Date()): QuizExpAward {
    const prev = courseProgress.value[courseId]
    const passed = isPassing(score)
    const quiz = quizScoreExp(score)
    const firstClear = passed && !prev?.completed ? FIRST_CLEAR_EXP : 0
    courseProgress.value[courseId] = {
      courseId,
      completed: (prev?.completed ?? false) || passed,
      bestScore: Math.max(prev?.bestScore ?? 0, score),
      latestScore: score,
    }
    records.value.push({ courseId, score, passed, completedAt: now.toISOString() })
    exp.value += quiz + firstClear
    return { quiz, firstClear, total: quiz + firstClear }
  }

  return { exp, records, courseProgress, levelInfo, latestRecords, recordQuizResult }
})
