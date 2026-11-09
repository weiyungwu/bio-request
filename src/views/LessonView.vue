<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import courses from '@/data/courses.json'
import type { Course } from '@/types/course'

const route = useRoute()
const course = computed(() =>
  (courses as Course[]).find((c) => c.id === String(route.params.courseId)),
)
</script>

<template>
  <!-- Placeholder: story and lessons are TASK-005/006. -->
  <main class="page-container space-y-4 py-8">
    <RouterLink
      to="/map"
      class="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-text"
      >← 回關卡地圖</RouterLink
    >
    <h1>{{ course?.storyTitle }}</h1>
  </main>
</template>
