<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import CellExplorer from '@/components/lesson/CellExplorer.vue'
import LessonCard from '@/components/lesson/LessonCard.vue'
import StoryDialog from '@/components/lesson/StoryDialog.vue'
import courses from '@/data/courses.json'
import { getLessonData } from '@/data/lessons'
import type { Course } from '@/types/course'

const route = useRoute()
const courseId = computed(() => String(route.params.courseId))
const course = computed(() => (courses as Course[]).find((c) => c.id === courseId.value))
const lesson = computed(() => getLessonData(courseId.value))

// story -> lesson -> explore (cell diagram) -> game (games are TASK-008/009)
const phase = ref<'story' | 'lesson' | 'explore' | 'game'>('story')
const lessonHeading = ref<HTMLElement | null>(null)
const exploreHeading = ref<HTMLElement | null>(null)
const gameHeading = ref<HTMLElement | null>(null)

// The view is reused when only :courseId changes; restart the flow.
watch(courseId, () => (phase.value = 'story'))

function enterLesson() {
  phase.value = 'lesson'
  nextTick(() => lessonHeading.value?.focus())
}

function enterExplore() {
  phase.value = 'explore'
  nextTick(() => exploreHeading.value?.focus())
}

function enterGame() {
  phase.value = 'game'
  nextTick(() => gameHeading.value?.focus())
}
</script>

<template>
  <main class="page-container space-y-4 py-8">
    <RouterLink
      to="/map"
      class="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-text"
      >← 回關卡地圖</RouterLink
    >
    <h1>{{ course?.storyTitle }}</h1>

    <StoryDialog
      v-if="phase === 'story' && lesson"
      :key="courseId"
      :story="lesson.story"
      @complete="enterLesson"
    />
    <section
      v-else-if="phase === 'lesson' || !lesson"
      data-testid="lesson-content"
      aria-labelledby="lesson-heading"
      class="space-y-4"
    >
      <h2 id="lesson-heading" ref="lessonHeading" tabindex="-1">探險者訓練</h2>
      <LessonCard
        v-if="lesson"
        :key="courseId"
        :lessons="lesson.lessons"
        @complete="enterExplore"
      />
    </section>
    <section
      v-else-if="phase === 'explore'"
      data-testid="explore-content"
      aria-labelledby="explore-heading"
      class="space-y-4"
    >
      <h2 id="explore-heading" ref="exploreHeading" tabindex="-1">細胞城市探險</h2>
      <CellExplorer
        :key="courseId"
        :points="lesson.lessons.flatMap((l) => l.knowledgePoints)"
        :targets="lesson.explorer.targets"
        @complete="enterGame"
      />
    </section>
    <section v-else data-testid="game-content" aria-labelledby="game-heading">
      <!-- Placeholder: interactive games are TASK-007/008/009. -->
      <h2 id="game-heading" ref="gameHeading" tabindex="-1">互動挑戰</h2>
    </section>
  </main>
</template>
