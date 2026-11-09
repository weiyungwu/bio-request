<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <!-- Placeholder: story and lessons are TASK-005/006. -->
  <main class="page-container py-8">
    <h1>第一關</h1>
    <p class="text-muted">{{ route.params.courseId }}</p>
  </main>
</template>
