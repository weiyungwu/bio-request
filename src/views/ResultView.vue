<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BaseCard from '@/components/common/BaseCard.vue'
import courses from '@/data/courses.json'
import { useProgressStore } from '@/stores/progress'
import { useQuizStore } from '@/stores/quiz'
import type { Course } from '@/types/course'
import { BADGES } from '@/utils/achievements'
import { DAILY_QUIZ_EXP_CAP } from '@/utils/exp'
import { PASS_SCORE, correctAnswerText, responseText } from '@/utils/quiz'

const route = useRoute()
const quiz = useQuizStore()
const progress = useProgressStore()
const courseId = computed(() => String(route.params.courseId))
const course = computed(() => (courses as Course[]).find((c) => c.id === courseId.value))

// The attempt lives in memory; a reload, another stage's attempt or a 弱點練習 (shown on its
// own page) means nothing to show.
const award = computed(() =>
  quiz.finished && quiz.kind === 'quiz' && quiz.courseId === courseId.value ? quiz.award : null,
)
const total = computed(() => quiz.questions.length)
const newBadges = computed(() => BADGES.filter((b) => award.value?.newBadges.includes(b.id)))
const wrong = computed(() => quiz.results.filter((r) => !r.correct))

const heading = ref<HTMLElement | null>(null)
onMounted(() => heading.value?.focus())

const linkClass = {
  primary:
    'inline-flex min-h-11 items-center justify-center rounded-control bg-explore px-5 font-bold text-on-accent hover:bg-explore-strong',
  secondary:
    'inline-flex min-h-11 items-center justify-center rounded-control border-2 border-explore px-5 font-bold text-explore hover:bg-explore/10',
}
</script>

<template>
  <main class="page-container space-y-4 py-8">
    <RouterLink
      to="/map"
      class="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-text"
      >← 回關卡地圖</RouterLink
    >
    <h1 ref="heading" tabindex="-1">{{ course?.storyTitle }}：測驗結果</h1>

    <BaseCard v-if="!award" as="section" data-testid="result-empty" class="space-y-3">
      <p>還沒有這一關的測驗結果（重新整理頁面後，本次結果不會保留）。</p>
      <RouterLink :to="`/quiz/${courseId}`" :class="linkClass.primary">開始測驗 →</RouterLink>
    </BaseCard>

    <template v-else>
      <BaseCard as="section" class="space-y-2" aria-labelledby="result-score-title">
        <h2 id="result-score-title" class="text-lg">本次成績</h2>
        <p data-testid="result-score" class="text-4xl font-bold">{{ quiz.score }} 分</p>
        <p
          data-testid="result-verdict"
          :class="quiz.passed ? 'text-success' : 'text-danger-text'"
          class="text-lg font-bold"
        >
          {{ quiz.passed ? '✓ 通過！' : `✗ 未通過（需要 ${PASS_SCORE} 分）` }}
        </p>
        <p data-testid="result-counts">
          答對 {{ quiz.correctCount }} 題 · 答錯 {{ total - quiz.correctCount }} 題（共
          {{ total }} 題）
        </p>
      </BaseCard>

      <BaseCard
        as="section"
        data-testid="result-exp"
        class="space-y-2"
        aria-labelledby="result-exp-title"
      >
        <h2 id="result-exp-title" class="text-lg">
          獲得 EXP <span class="text-reward">+{{ award.total }}</span>
        </h2>
        <ul v-if="award.total > 0" class="space-y-1">
          <li v-if="award.quiz > 0">測驗分數獎勵 +{{ award.quiz }}</li>
          <li v-if="award.firstClear > 0">首次通關獎勵 +{{ award.firstClear }}</li>
        </ul>
        <p v-else-if="!award.capped" class="text-muted">60 分以上才能獲得 EXP，再試一次吧！</p>
        <p v-if="award.capped" data-testid="result-capped" class="text-sm text-muted">
          今天的測驗 EXP 已達上限（每天 {{ DAILY_QUIZ_EXP_CAP }} EXP），明天再來挑戰吧！
        </p>
        <p class="text-sm text-muted">
          目前 Lv.{{ progress.levelInfo.level }} {{ progress.levelInfo.title }} ·
          {{ progress.levelInfo.exp }} EXP
        </p>
      </BaseCard>

      <BaseCard
        v-if="newBadges.length"
        as="section"
        data-testid="result-badges"
        class="space-y-2"
        aria-labelledby="result-badges-title"
      >
        <h2 id="result-badges-title" class="text-lg">新取得徽章</h2>
        <ul class="flex flex-wrap gap-3">
          <li v-for="b in newBadges" :key="b.id" class="flex items-center gap-2 font-semibold">
            <span aria-hidden="true" class="text-2xl">{{ b.icon }}</span
            >{{ b.name }}
          </li>
        </ul>
      </BaseCard>

      <BaseCard
        as="section"
        data-testid="result-review"
        class="space-y-3"
        aria-labelledby="result-review-title"
      >
        <h2 id="result-review-title" class="text-lg">錯題補強</h2>
        <p v-if="wrong.length === 0">全部答對，沒有需要補強的題目！</p>
        <ol v-else class="space-y-3">
          <li
            v-for="r in wrong"
            :key="r.question.id"
            data-testid="result-wrong"
            class="space-y-1 rounded-control border border-border px-4 py-3"
          >
            <p class="font-semibold">{{ r.question.question }}</p>
            <p class="text-sm text-danger-text">
              <span aria-hidden="true">✗ </span>你的答案：{{ responseText(r.question, r.response) }}
            </p>
            <p class="text-sm text-success">
              <span aria-hidden="true">✓ </span>正確答案：{{ correctAnswerText(r.question) }}
            </p>
            <p class="text-sm text-muted">解析：{{ r.question.explanation }}</p>
          </li>
        </ol>
        <RouterLink
          v-if="wrong.length > 0"
          to="/review"
          data-testid="result-to-review"
          :class="linkClass.secondary"
          >到錯題本複習 →</RouterLink
        >
      </BaseCard>

      <div class="flex flex-wrap gap-3">
        <RouterLink
          :to="`/quiz/${courseId}`"
          data-testid="result-retry"
          :class="quiz.passed ? linkClass.secondary : linkClass.primary"
          >↺ 再挑戰</RouterLink
        >
        <RouterLink to="/map" :class="quiz.passed ? linkClass.primary : linkClass.secondary"
          >回關卡地圖</RouterLink
        >
      </div>
    </template>
  </main>
</template>
