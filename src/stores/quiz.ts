import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { Question } from '@/types/question'
import {
  QUIZ_SIZE,
  drawQuestions,
  emptyResponse,
  isAnswered,
  isCorrect,
  isPassing,
  scoreOf,
  type QuizResponse,
} from '@/utils/quiz'

/** One quiz attempt (TASK-011). In memory only; results are saved by TASK-013. */
export const useQuizStore = defineStore('quiz', () => {
  const courseId = ref<string | null>(null)
  // shallowRef: the bank's question objects are shared and never mutated.
  const questions = shallowRef<Question[]>([])
  const responses = ref<QuizResponse[]>([])
  const submitted = ref<boolean[]>([])
  const index = ref(0)
  const finished = ref(false)

  const current = computed(() => questions.value[index.value])
  const response = computed(() => responses.value[index.value] ?? [])
  const isSubmitted = computed(() => submitted.value[index.value] === true)
  const results = computed(() =>
    questions.value.map((q, i) => ({
      question: q,
      response: responses.value[i]!,
      correct: isCorrect(q, responses.value[i]!),
    })),
  )
  const correctCount = computed(() => results.value.filter((r) => r.correct).length)
  const score = computed(() => scoreOf(correctCount.value, questions.value.length))
  const passed = computed(() => isPassing(score.value))

  /** Starts (or restarts) a quiz: a new draw, and nothing kept from the last round. */
  function start(id: string, pool: readonly Question[], random: () => number = Math.random) {
    courseId.value = id
    questions.value = drawQuestions(pool, QUIZ_SIZE, random)
    responses.value = questions.value.map(emptyResponse)
    submitted.value = questions.value.map(() => false)
    index.value = 0
    finished.value = false
  }

  /** Forgets any attempt, e.g. when a course has no usable bank (review S1). */
  function reset() {
    courseId.value = null
    questions.value = []
    responses.value = []
    submitted.value = []
    index.value = 0
    finished.value = false
  }

  /** Sets one slot of the current answer; ignored once the question is submitted. */
  function choose(slot: number, value: number | null) {
    const r = responses.value[index.value]
    if (!r || isSubmitted.value || slot < 0 || slot >= r.length) return
    r[slot] = value
  }

  function submit() {
    if (isSubmitted.value || !isAnswered(response.value)) return
    submitted.value[index.value] = true
  }

  function next() {
    if (!isSubmitted.value) return
    if (index.value < questions.value.length - 1) index.value++
    else finished.value = true
  }

  return {
    courseId,
    questions,
    responses,
    index,
    finished,
    current,
    response,
    isSubmitted,
    results,
    correctCount,
    score,
    passed,
    start,
    reset,
    choose,
    submit,
    next,
  }
})
