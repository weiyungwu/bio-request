<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number
    max?: number
    label: string
    tone?: 'explore' | 'reward'
  }>(),
  { max: 100, tone: 'explore' },
)

const percent = computed(() => {
  if (!(props.max > 0)) return 0
  return Math.min(100, Math.max(0, (props.value / props.max) * 100))
})
</script>

<template>
  <div
    role="progressbar"
    :aria-label="label"
    aria-valuemin="0"
    :aria-valuemax="max"
    :aria-valuenow="value"
    class="h-3 w-full overflow-hidden rounded-pill bg-surface-2"
  >
    <div
      data-testid="progress-fill"
      :class="[
        'h-full rounded-pill transition-[width] duration-500',
        tone === 'reward' ? 'bg-reward' : 'bg-explore',
      ]"
      :style="{ width: `${percent}%` }"
    />
  </div>
</template>
