<script setup lang="ts">
defineProps<{
  /** StoryCharacter id (e.g. 'captain', 'miko'). Unrecognised ids fall back to `fallback`. */
  characterId: string
  /** Emoji shown for a character without an illustration yet (lesson.ts: "placeholder"). */
  fallback: string
}>()
</script>

<template>
  <svg
    v-if="characterId === 'captain'"
    viewBox="0 0 64 64"
    aria-hidden="true"
    focusable="false"
    class="h-full w-full"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="32"
      cy="32"
      r="30"
      fill="var(--color-surface-2)"
      stroke="var(--color-explore)"
      stroke-width="3"
    />
    <path d="M13 33 a19 19 0 0 1 38 0 v3 h-38 z" fill="var(--color-explore)" />
    <rect x="15" y="31" width="34" height="19" rx="9.5" fill="var(--color-surface)" />
    <rect x="13" y="29" width="38" height="9" rx="4.5" fill="var(--color-reward)" />
    <circle
      cx="23.5"
      cy="33.5"
      r="5.5"
      fill="var(--color-surface)"
      stroke="var(--color-on-accent)"
      stroke-width="1.5"
    />
    <circle
      cx="40.5"
      cy="33.5"
      r="5.5"
      fill="var(--color-surface)"
      stroke="var(--color-on-accent)"
      stroke-width="1.5"
    />
    <circle cx="23.5" cy="33.5" r="2.2" fill="var(--color-on-accent)" />
    <circle cx="40.5" cy="33.5" r="2.2" fill="var(--color-on-accent)" />
    <path
      d="M25 44 q7 6 14 0"
      fill="none"
      stroke="var(--color-on-accent)"
      stroke-width="2"
      stroke-linecap="round"
    />
    <path
      d="M32 7 l2.1 4.3 4.8 .7 -3.5 3.4 .8 4.8 -4.2 -2.2 -4.2 2.2 .8 -4.8 -3.5 -3.4 4.8 -.7z"
      fill="var(--color-bio)"
    />
  </svg>
  <svg
    v-else-if="characterId === 'miko'"
    viewBox="0 0 64 64"
    aria-hidden="true"
    focusable="false"
    class="h-full w-full"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="32"
      cy="32"
      r="30"
      fill="var(--color-surface-2)"
      stroke="var(--color-bio)"
      stroke-width="3"
    />
    <line
      x1="32"
      y1="10"
      x2="32"
      y2="17"
      stroke="var(--color-muted)"
      stroke-width="2.5"
      stroke-linecap="round"
    />
    <circle cx="32" cy="8" r="3.5" fill="var(--color-reward)" />
    <rect
      x="14"
      y="17"
      width="36"
      height="30"
      rx="10"
      fill="var(--color-surface)"
      stroke="var(--color-explore)"
      stroke-width="2.5"
    />
    <rect x="18" y="22" width="28" height="4" rx="2" fill="var(--color-explore)" opacity="0.5" />
    <circle cx="24" cy="34" r="5.5" fill="var(--color-bio)" />
    <circle cx="40" cy="34" r="5.5" fill="var(--color-bio)" />
    <circle cx="24" cy="34" r="2" fill="var(--color-on-accent)" />
    <circle cx="40" cy="34" r="2" fill="var(--color-on-accent)" />
    <rect x="27" y="42" width="2.5" height="5" rx="1.25" fill="var(--color-explore)" />
    <rect x="31" y="42" width="2.5" height="5" rx="1.25" fill="var(--color-explore)" />
    <rect x="35" y="42" width="2.5" height="5" rx="1.25" fill="var(--color-explore)" />
  </svg>
  <span v-else aria-hidden="true" class="text-4xl leading-none">{{ fallback }}</span>
</template>
