<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import type { Story } from '@/types/lesson'
import { STORY_ADVANCE_COOLDOWN_MS } from './storyDialog'

const props = defineProps<{ story: Story }>()
const emit = defineEmits<{ complete: [] }>()

const index = ref(0)
const showMission = ref(false)
const ready = ref(false)
const completed = ref(false)
const missionHeading = ref<HTMLElement | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

function startCooldown() {
  ready.value = false
  clearTimeout(timer)
  timer = setTimeout(() => (ready.value = true), STORY_ADVANCE_COOLDOWN_MS)
}
// Initial cooldown too: a double tap on the map's stage card must not skip line 1.
startCooldown()
onBeforeUnmount(() => clearTimeout(timer))

const line = computed(() => props.story.lines[index.value]!)
const speaker = computed(() => props.story.characters.find((c) => c.id === line.value.speaker))
const isLast = computed(() => index.value === props.story.lines.length - 1)

function next() {
  if (!ready.value) return
  if (isLast.value) {
    showMission.value = true
    // The card replaces the dialog; move focus in so keyboard and screen-reader
    // users land on the mission title (Tab reaches the start button next).
    nextTick(() => missionHeading.value?.focus())
  } else {
    index.value++
  }
  startCooldown()
}

function start() {
  if (!ready.value || completed.value) return
  completed.value = true
  emit('complete')
}
</script>

<template>
  <section data-testid="story-dialog" aria-label="故事對話" class="space-y-4">
    <BaseCard v-if="!showMission" as="div" highlight="explore" class="space-y-4">
      <div data-testid="story-line" aria-live="polite" aria-atomic="true" class="flex gap-4">
        <span aria-hidden="true" class="text-5xl leading-none">{{ speaker?.avatar }}</span>
        <div class="min-w-0 space-y-1">
          <p class="font-bold text-explore">{{ speaker?.name }}</p>
          <p class="text-lg">{{ line.text }}</p>
        </div>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm text-muted">{{ index + 1 }} / {{ story.lines.length }}</span>
        <BaseButton data-testid="story-next" @click="next">
          {{ isLast ? '查看任務' : '下一段' }} →
        </BaseButton>
      </div>
    </BaseCard>

    <BaseCard v-else data-testid="mission-card" as="div" highlight="reward" class="space-y-4">
      <p class="text-sm font-semibold text-reward"><span aria-hidden="true">📜 </span>任務指令</p>
      <h2 ref="missionHeading" tabindex="-1">{{ story.title }}</h2>
      <ul class="space-y-1">
        <li v-for="objective in story.objectives" :key="objective">
          <span aria-hidden="true">🎯 </span>{{ objective }}
        </li>
      </ul>
      <BaseButton data-testid="mission-start" variant="reward" size="lg" block @click="start">
        接受任務，開始訓練 →
      </BaseButton>
    </BaseCard>
  </section>
</template>
