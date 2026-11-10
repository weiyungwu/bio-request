<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import BaseTag from '@/components/common/BaseTag.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import courses from '@/data/courses.json'
import type { Course } from '@/types/course'
import { useProgressStore } from '@/stores/progress'
import { stageStatus } from '@/utils/stages'

const progress = useProgressStore()

// Decorative theme icons (spec 頁面二: 關卡主題插畫) until real art exists.
const THEME_ICON: Record<string, string> = {
  'bio-01': '🔬',
  'bio-02': '🧫',
  'bio-03': '🔍',
  'bio-04': '🌱',
  'bio-05': '🍎',
  'bio-06': '❤️',
  'bio-07': '🧠',
  'bio-08': '🧬',
}

const stages = computed(() =>
  [...(courses as Course[])]
    .sort((a, b) => a.order - b.order)
    .map((course) => ({
      course,
      status: stageStatus(course.id, progress.courseProgress),
      bestScore: progress.courseProgress[course.id]?.bestScore,
    })),
)

const completedCount = computed(() => stages.value.filter((s) => s.status === 'completed').length)
const lockedCount = computed(() => stages.value.filter((s) => s.status === 'locked').length)

const STATUS_LABEL = {
  completed: { icon: '✓', text: '已完成' },
  'in-progress': { icon: '⏳', text: '進行中' },
  open: { icon: '▶', text: '可挑戰' },
} as const
// BaseTag look, made clickable: hover rings it in its text colour, deepens the fill (20%:
// tag text stays >= 4.9:1; 30% would drop below AA) and shows a pointer.
// before: widens the hit area without changing the look; the two stacked pills extend it
// only 4px towards each other so their boxes meet at the gap instead of overlapping.
const pill =
  'relative z-10 inline-flex cursor-pointer items-center gap-1 rounded-pill px-3 py-0.5 text-sm font-semibold transition-[background-color,box-shadow] hover:ring-2 hover:ring-current before:absolute before:inset-x-0 motion-reduce:transition-none'
const pillExplore = 'bg-explore/15 text-explore hover:bg-explore/20'
const pillSuccess = 'bg-success/15 text-success hover:bg-success/20'

const cardBase =
  'relative flex h-full flex-col gap-3 rounded-card border bg-surface p-4 shadow-card sm:p-5'
const cardInteractive =
  'transition-[border-color,box-shadow,translate] hover:border-explore hover:shadow-glow-explore has-[[data-testid=stage-link]:focus-visible]:border-explore has-[[data-testid=stage-link]:focus-visible]:shadow-glow-explore has-[[data-testid=stage-link]:active]:translate-y-0.5 motion-reduce:transition-none'
</script>

<template>
  <main class="page-container space-y-6 py-8">
    <header class="space-y-4">
      <RouterLink
        to="/"
        class="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-text"
        >← 回首頁</RouterLink
      >
      <h1>關卡地圖</h1>
      <div data-testid="map-progress" class="space-y-2">
        <p class="font-semibold">已完成 {{ completedCount }} / {{ stages.length }} 關</p>
        <ProgressBar :value="completedCount" :max="stages.length" label="關卡完成進度" />
      </div>
      <p v-if="lockedCount > 0" data-testid="locked-notice" class="text-sm text-muted">
        💡 還有 {{ lockedCount }} 關正在製作中，敬請期待！它們會在內容完成後開放，和你的分數無關。
      </p>
    </header>

    <ol class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <li v-for="{ course, status, bestScore } in stages" :key="course.id" data-testid="stage-card">
        <div
          :class="[
            cardBase,
            status === 'locked' ? 'border-dashed border-border' : cardInteractive,
            status === 'completed' ? 'border-success' : '',
            status === 'open' || status === 'in-progress' ? 'border-explore' : '',
          ]"
        >
          <div class="flex items-start justify-between gap-2">
            <span class="text-sm font-semibold text-muted">第 {{ course.order }} 關</span>
            <!-- Status tag with 直接測驗 under it, left edges aligned. -->
            <div class="flex flex-col items-start gap-2">
              <BaseTag v-if="status === 'locked'">🔒 未開放</BaseTag>
              <!-- Above the card link (z-10) so its own hover shows; tabindex -1: the title
                   link already gives keyboard users the same lesson stop. -->
              <RouterLink
                v-else
                :to="`/lesson/${course.id}`"
                tabindex="-1"
                data-testid="stage-status"
                :aria-label="`${STATUS_LABEL[status].text}：第 ${course.order} 關`"
                :class="[
                  pill,
                  'before:-top-2.5 before:-bottom-1',
                  status === 'completed' ? pillSuccess : pillExplore,
                ]"
                >{{ STATUS_LABEL[status].icon }} {{ STATUS_LABEL[status].text }}</RouterLink
              >
              <!-- Above the card link (z-10); uses the global :focus-visible outline. -->
              <RouterLink
                v-if="status !== 'locked'"
                :to="`/quiz/${course.id}`"
                data-testid="stage-quiz"
                :aria-label="`直接測驗：第 ${course.order} 關`"
                :class="[pill, 'before:-top-1 before:-bottom-2.5', pillExplore]"
                >📝 直接測驗</RouterLink
              >
            </div>
          </div>
          <span aria-hidden="true" class="text-4xl">{{ THEME_ICON[course.id] }}</span>
          <div class="space-y-1">
            <h2 :class="['text-lg', status === 'locked' && 'text-muted']">
              <!-- Stretched over the whole card (after:inset-0), so the card still enters the lesson.
                   Focus draws the app's usual outline around the card, not the title. -->
              <RouterLink
                v-if="status !== 'locked'"
                :to="`/lesson/${course.id}`"
                data-testid="stage-link"
                class="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-offset-2 focus-visible:after:outline-reward"
                >{{ course.storyTitle }}</RouterLink
              >
              <template v-else>{{ course.storyTitle }}</template>
            </h2>
            <p class="text-sm text-muted">{{ course.title }}・{{ course.description }}</p>
          </div>
          <p
            v-if="status === 'completed'"
            class="mt-auto flex flex-wrap items-center justify-between gap-2"
          >
            <span v-if="bestScore !== undefined" class="font-semibold text-reward">
              最佳 {{ bestScore }} 分
            </span>
            <span class="text-sm font-semibold text-explore">再次挑戰 →</span>
          </p>
        </div>
      </li>
    </ol>
  </main>
</template>
