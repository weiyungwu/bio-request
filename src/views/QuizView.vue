<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BaseCard from '@/components/common/BaseCard.vue'
import QuizPlayer from '@/components/quiz/QuizPlayer.vue'
import courses from '@/data/courses.json'
import { getQuestionBank } from '@/data/questions'
import { useQuizStore } from '@/stores/quiz'
import type { Course } from '@/types/course'
import { QUIZ_SIZE } from '@/utils/quiz'

const route = useRoute()
const router = useRouter()
const quiz = useQuizStore()
const courseId = computed(() => String(route.params.courseId))
const course = computed(() => (courses as Course[]).find((c) => c.id === courseId.value))
const bank = computed(() => getQuestionBank(courseId.value))
// spec 5.4 draws 5; with fewer valid questions the quiz can't be a fair 5-question paper.
const canStart = computed(() => (bank.value?.questions.length ?? 0) >= QUIZ_SIZE)

// Bumped per start; QuizPlayer remounts the question on it.
const round = ref(0)

function start() {
  if (!bank.value || !canStart.value) return quiz.reset()
  quiz.start(courseId.value, bank.value.questions)
  round.value++
}
watch(courseId, start, { immediate: true })

function next() {
  if (quiz.finished) return
  quiz.next()
  // replace: browser Back from the result goes to the map side, not into a quiz page that
  // would start a new paper and drop the result being viewed (TASK-012 review S1).
  if (quiz.finished) router.replace(`/result/${courseId.value}`)
}
</script>

<template>
  <main class="page-container space-y-4 py-8">
    <RouterLink
      to="/map"
      class="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-text"
      >← 回關卡地圖</RouterLink
    >
    <h1>{{ course?.storyTitle }}：關卡測驗</h1>

    <!-- TASK-010: 缺少必要欄位時能顯示資料錯誤 (for whoever maintains the bank). -->
    <BaseCard
      v-if="!bank || bank.errors.length > 0 || !canStart"
      as="section"
      data-testid="quiz-data-error"
      class="space-y-2 border-danger"
      aria-labelledby="quiz-data-error-title"
    >
      <h2 id="quiz-data-error-title" class="text-lg text-danger-text">⚠ 題庫資料錯誤</h2>
      <p v-if="!bank">這個關卡沒有題庫檔案。</p>
      <p v-else-if="!canStart">
        有效題目只有 {{ bank.questions.length }} 題，至少需要 {{ QUIZ_SIZE }} 題才能出題。
      </p>
      <p v-else>以下題目有問題，已暫時排除，其餘題目照常出題：</p>
      <ul v-if="bank?.errors.length" class="list-disc space-y-1 pl-5 text-sm">
        <li v-for="(e, i) in bank.errors" :key="i">{{ e.message }}</li>
      </ul>
    </BaseCard>

    <QuizPlayer v-if="canStart" :round="round" @next="next" />
  </main>
</template>
