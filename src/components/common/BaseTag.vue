<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'neutral' | 'explore' | 'reward' | 'success' | 'danger' | 'bio'
  }>(),
  { tone: 'neutral' },
)

const toneClass = {
  neutral: 'bg-surface-2 text-muted',
  explore: 'bg-explore/15 text-explore',
  reward: 'bg-reward/15 text-reward',
  success: 'bg-success/15 text-success',
  danger: 'bg-danger/15 text-danger-text',
  bio: 'bg-bio/15 text-bio',
} as const
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-pill px-3 py-0.5 text-sm font-semibold',
      toneClass[tone],
    ]"
  >
    <slot />
  </span>
</template>
