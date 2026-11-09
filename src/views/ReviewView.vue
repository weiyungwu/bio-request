<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BaseCard from '@/components/common/BaseCard.vue'
import ReviewItem from '@/components/quiz/ReviewItem.vue'
import courses from '@/data/courses.json'
import { getQuestionBank } from '@/data/questions'
import { useProgressStore } from '@/stores/progress'
import type { Course } from '@/types/course'

const progress = useProgressStore()

// 依關卡分類, in map order. Within a stage: 待複習 first, then the most recent mistakes.
const groups = computed(() =>
  [...(courses as Course[])]
    .sort((a, b) => a.order - b.order)
    .map((course) => {
      const bank = new Map(getQuestionBank(course.id)?.questions.map((q) => [q.id, q]) ?? [])
      const entries = Object.values(progress.wrongQuestions).filter((w) => w.courseId === course.id)
      const items = entries
        .flatMap((entry) => {
          const question = bank.get(entry.questionId)
          return question ? [{ entry, question }] : []
        })
        .sort(
          (a, b) =>
            Number(a.entry.mastered) - Number(b.entry.mastered) ||
            Date.parse(b.entry.lastWrongAt) - Date.parse(a.entry.lastWrongAt),
        )
      return { course, items, missing: entries.length - items.length }
    })
    .filter((g) => g.items.length > 0 || g.missing > 0),
)
const toReview = computed(
  () => Object.values(progress.wrongQuestions).filter((w) => !w.mastered).length,
)

const heading = ref<HTMLElement | null>(null)
onMounted(() => heading.value?.focus())
</script>

<template>
  <main class="page-container space-y-4 py-8">
    <RouterLink
      to="/"
      class="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-text"
      >← 回首頁</RouterLink
    >
    <h1 ref="heading" tabindex="-1">錯題本</h1>
    <p data-testid="review-summary" class="text-muted">
      <template v-if="groups.length">還有 {{ toReview }} 題待複習。</template>
      <template v-else>目前沒有錯題。完成關卡測驗後，答錯的題目會出現在這裡。</template>
    </p>

    <BaseCard
      v-for="g in groups"
      :key="g.course.id"
      as="section"
      data-testid="review-group"
      :data-course="g.course.id"
      class="space-y-3"
      :aria-labelledby="`review-${g.course.id}`"
    >
      <h2 :id="`review-${g.course.id}`" class="text-xl">
        第 {{ g.course.order }} 關 {{ g.course.storyTitle }}
      </h2>
      <ul class="space-y-3">
        <ReviewItem
          v-for="it in g.items"
          :key="it.entry.questionId"
          :entry="it.entry"
          :question="it.question"
        />
      </ul>
      <p v-if="g.missing > 0" data-testid="review-missing" class="text-sm text-muted">
        另有 {{ g.missing }} 題已不在題庫中，無法顯示。
      </p>
    </BaseCard>
  </main>
</template>
