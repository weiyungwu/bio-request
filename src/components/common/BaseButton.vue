<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'reward' | 'ghost'
    size?: 'md' | 'lg'
    type?: 'button' | 'submit'
    disabled?: boolean
    block?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button', disabled: false, block: false },
)

const variantClass = {
  primary: 'bg-explore text-on-accent hover:bg-explore-strong hover:shadow-glow-explore',
  secondary: 'border-2 border-explore text-explore hover:bg-explore/10',
  reward: 'bg-reward text-on-accent hover:bg-reward-strong hover:shadow-glow-reward',
  ghost: 'text-muted hover:bg-surface-2 hover:text-text',
} as const

const sizeClass = {
  md: 'min-h-11 px-5 text-base',
  lg: 'min-h-14 px-8 text-lg',
} as const
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="[
      'inline-flex items-center justify-center gap-2 rounded-control font-bold transition-[color,background-color,border-color,box-shadow]',
      'disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none',
      variantClass[variant],
      sizeClass[size],
      block && 'w-full',
    ]"
  >
    <slot />
  </button>
</template>
