<script setup lang="ts">
withDefaults(
  defineProps<{
    as?: string
    highlight?: 'none' | 'explore' | 'reward'
  }>(),
  { as: 'div', highlight: 'none' },
)

const highlightClass = {
  none: 'border-border',
  explore: 'border-explore shadow-glow-explore',
  reward: 'border-reward shadow-glow-reward',
} as const
</script>

<template>
  <component
    :is="as"
    :class="['rounded-card border bg-surface p-4 shadow-card sm:p-6', highlightClass[highlight]]"
  >
    <slot />
  </component>
</template>
