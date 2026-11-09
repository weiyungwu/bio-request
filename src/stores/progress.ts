import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { LearningRecord } from '@/types/progress'
import { levelFromExp } from '@/utils/level'

const RECENT_LIMIT = 3

// In-memory only for now; LocalStorage persistence is TASK-013.
export const useProgressStore = defineStore('progress', () => {
  const exp = ref(0)
  const records = ref<LearningRecord[]>([])

  const levelInfo = computed(() => levelFromExp(exp.value))
  const latestRecords = computed(() =>
    records.value
      .map((record) => ({ record, time: Date.parse(record.completedAt) }))
      .filter(({ time }) => !Number.isNaN(time))
      .sort((a, b) => b.time - a.time)
      .slice(0, RECENT_LIMIT)
      .map(({ record }) => record),
  )

  return { exp, records, levelInfo, latestRecords }
})
