<script setup lang="ts">
withDefaults(defineProps<{ title?: string }>(), { title: '考試重點' })
</script>

<template>
  <aside
    data-testid="important-note"
    class="rounded-control border-l-4 border-reward bg-reward/10 px-4 py-3"
  >
    <p class="text-sm font-bold text-reward"><span aria-hidden="true">⭐ </span>{{ title }}</p>
    <p class="mt-1"><slot /></p>
  </aside>
</template>
