<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import courses from '@/data/courses.json'
import type { Course } from '@/types/course'

const route = useRoute()
const course = computed(() =>
  (courses as Course[]).find((c) => c.id === String(route.params.courseId)),
)
</script>

<template>
  <!-- Placeholder: story and lessons are TASK-005/006. -->
  <main class="page-container py-8">
    <h1>{{ course?.storyTitle }}</h1>
  </main>
</template>
