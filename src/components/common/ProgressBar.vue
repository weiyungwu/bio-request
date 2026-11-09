<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number
    max?: number
    label: string
    tone?: 'explore' | 'reward'
    /** When set, shows "value / max unit" above the bar, e.g. unit="EXP". */
    unit?: string
  }>(),
  { max: 100, tone: 'explore' },
)

const safeMax = computed(() => (props.max > 0 ? props.max : 0))
const clampedValue = computed(() => Math.min(safeMax.value, Math.max(0, props.value)))
const percent = computed(() => (safeMax.value ? (clampedValue.value / safeMax.value) * 100 : 0))
const valueText = computed(() =>
  props.unit ? `${clampedValue.value} / ${safeMax.value} ${props.unit}` : undefined,
)
</script>

<template>
  <div>
    <p v-if="valueText" aria-hidden="true" class="mb-1 text-right text-sm font-semibold text-muted">
      {{ valueText }}
    </p>
    <div
      role="progressbar"
      :aria-label="label"
      aria-valuemin="0"
      :aria-valuemax="safeMax"
      :aria-valuenow="clampedValue"
      :aria-valuetext="valueText"
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
  </div>
</template>
