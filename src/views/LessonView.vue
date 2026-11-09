<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import StoryDialog from '@/components/lesson/StoryDialog.vue'
import courses from '@/data/courses.json'
import { getLessonData } from '@/data/lessons'
import type { Course } from '@/types/course'

const route = useRoute()
const courseId = computed(() => String(route.params.courseId))
const course = computed(() => (courses as Course[]).find((c) => c.id === courseId.value))
const lesson = computed(() => getLessonData(courseId.value))

// story -> lesson (TASK-006 fills the lesson step)
const phase = ref<'story' | 'lesson'>('story')
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
      :story="lesson.story"
      @complete="phase = 'lesson'"
    />
    <section v-else data-testid="lesson-content" aria-labelledby="lesson-heading">
      <!-- Placeholder: lesson cards are TASK-006. -->
      <h2 id="lesson-heading">探險者訓練</h2>
    </section>
  </main>
</template>
