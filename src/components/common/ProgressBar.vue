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

const safeMax = computed(() => (props.max > 0 ? props.max : 0))
const clampedValue = computed(() => Math.min(safeMax.value, Math.max(0, props.value)))
const percent = computed(() => (safeMax.value ? (clampedValue.value / safeMax.value) * 100 : 0))
</script>

<template>
  <div
    role="progressbar"
    :aria-label="label"
    aria-valuemin="0"
    :aria-valuemax="safeMax"
    :aria-valuenow="clampedValue"
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
