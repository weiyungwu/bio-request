<script setup lang="ts">
import type { LessonImage } from '@/types/lesson'

defineProps<{ image: LessonImage }>()
</script>

<template>
  <figure class="space-y-2">
    <img
      :src="image.src"
      :alt="image.alt"
      width="320"
      height="240"
      class="w-full max-w-md rounded-control border border-border"
    />
    <figcaption class="text-sm text-muted">{{ image.caption }}</figcaption>
  </figure>
</template>
