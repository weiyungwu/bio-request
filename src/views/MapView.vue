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

const cardBase = 'flex h-full flex-col gap-3 rounded-card border bg-surface p-4 shadow-card sm:p-5'
const cardInteractive =
  'transition-[border-color,box-shadow,translate] hover:border-explore hover:shadow-glow-explore focus-visible:border-explore focus-visible:shadow-glow-explore active:translate-y-0.5 motion-reduce:transition-none'
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
        <component
          :is="status === 'locked' ? 'div' : RouterLink"
          v-bind="status === 'locked' ? {} : { to: `/lesson/${course.id}` }"
          :class="[
            cardBase,
            status === 'locked' ? 'border-dashed border-border' : cardInteractive,
            status === 'completed' ? 'border-success' : '',
            status === 'open' || status === 'in-progress' ? 'border-explore' : '',
          ]"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-semibold text-muted">第 {{ course.order }} 關</span>
            <BaseTag v-if="status === 'completed'" tone="success">✓ 已完成</BaseTag>
            <BaseTag v-else-if="status === 'in-progress'" tone="explore">⏳ 進行中</BaseTag>
            <BaseTag v-else-if="status === 'open'" tone="explore">▶ 可挑戰</BaseTag>
            <BaseTag v-else>🔒 未開放</BaseTag>
          </div>
          <span aria-hidden="true" class="text-4xl">{{ THEME_ICON[course.id] }}</span>
          <div class="space-y-1">
            <h2 :class="['text-lg', status === 'locked' && 'text-muted']">
              {{ course.storyTitle }}
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
        </component>
      </li>
    </ol>
  </main>
</template>
