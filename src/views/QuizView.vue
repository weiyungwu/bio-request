<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import QuizQuestion from '@/components/quiz/QuizQuestion.vue'
import courses from '@/data/courses.json'
import { getQuestionBank } from '@/data/questions'
import { useQuizStore } from '@/stores/quiz'
import type { Course } from '@/types/course'
import { PASS_SCORE, QUIZ_SIZE, hasRepeats } from '@/utils/quiz'

const route = useRoute()
const quiz = useQuizStore()
const courseId = computed(() => String(route.params.courseId))
const course = computed(() => (courses as Course[]).find((c) => c.id === courseId.value))
const bank = computed(() => getQuestionBank(courseId.value))
// spec 5.4 draws 5; with fewer valid questions the quiz can't be a fair 5-question paper.
const canStart = computed(() => (bank.value?.questions.length ?? 0) >= QUIZ_SIZE)

const resultHeading = ref<HTMLElement | null>(null)
// Bumped per start so the question remounts (and takes focus) even when index stays 0.
const round = ref(0)

function start() {
  if (!bank.value || !canStart.value) return quiz.reset()
  quiz.start(courseId.value, bank.value.questions)
  round.value++
}
watch(courseId, start, { immediate: true })

const remaining = computed(() => quiz.questions.length - quiz.index - (quiz.isSubmitted ? 1 : 0))
const blanks = computed(() => quiz.response.filter((v) => v === null).length)
const repeats = computed(() => hasRepeats(quiz.response))
const submitHint = computed(() => {
  if (blanks.value > 0)
    return quiz.response.length === 1 ? '請先選擇一個答案' : `還有 ${blanks.value} 個空格沒有選`
  return repeats.value ? '有重複的選項，每個選項只能用一次' : ''
})

function next() {
  quiz.next()
  if (quiz.finished) nextTick(() => resultHeading.value?.focus())
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

    <BaseCard
      v-if="canStart && !quiz.finished && quiz.current"
      as="section"
      class="space-y-5"
      aria-label="測驗題目"
    >
      <div class="space-y-2">
        <p data-testid="quiz-progress" class="text-sm font-semibold text-muted">
          第 {{ quiz.index + 1 }} / {{ quiz.questions.length }} 題 · 還剩 {{ remaining }} 題
        </p>
        <ProgressBar
          :value="quiz.index + (quiz.isSubmitted ? 1 : 0)"
          :max="quiz.questions.length"
          label="作答進度"
        />
      </div>

      <QuizQuestion
        :key="`${round}-${quiz.index}`"
        :question="quiz.current"
        :response="quiz.response"
        :submitted="quiz.isSubmitted"
        @choose="quiz.choose"
      />

      <div v-if="!quiz.isSubmitted" class="flex flex-wrap items-center gap-3">
        <BaseButton
          data-testid="quiz-submit"
          :disabled="blanks > 0 || repeats"
          aria-describedby="quiz-submit-hint"
          @click="quiz.submit"
        >
          提交答案
        </BaseButton>
        <p id="quiz-submit-hint" data-testid="quiz-submit-hint" class="text-sm text-muted">
          {{ submitHint }}
        </p>
      </div>
      <BaseButton v-else data-testid="quiz-next" @click="next">
        {{ quiz.index < quiz.questions.length - 1 ? '下一題 →' : '看成績 →' }}
      </BaseButton>
    </BaseCard>

    <!-- Minimal score; the full result page (EXP, 錯題補強) is TASK-012. -->
    <BaseCard
      v-if="canStart && quiz.finished"
      as="section"
      data-testid="quiz-result"
      class="space-y-3"
      aria-labelledby="quiz-result-title"
    >
      <h2 id="quiz-result-title" ref="resultHeading" tabindex="-1">測驗完成</h2>
      <p data-testid="quiz-score" class="text-3xl font-bold">{{ quiz.score }} 分</p>
      <p>答對 {{ quiz.correctCount }} / {{ quiz.questions.length }} 題</p>
      <p
        data-testid="quiz-verdict"
        :class="quiz.passed ? 'text-success' : 'text-danger-text'"
        class="font-bold"
      >
        {{ quiz.passed ? `✓ 通過！（${PASS_SCORE} 分以上）` : `✗ 未通過，需要 ${PASS_SCORE} 分` }}
      </p>
      <div class="flex flex-wrap gap-3">
        <BaseButton data-testid="quiz-restart" variant="secondary" @click="start">
          ↺ 重新測驗
        </BaseButton>
        <RouterLink
          to="/map"
          class="inline-flex min-h-11 items-center justify-center rounded-control px-5 font-bold text-muted hover:bg-surface-2 hover:text-text"
          >回關卡地圖</RouterLink
        >
      </div>
    </BaseCard>
  </main>
</template>
