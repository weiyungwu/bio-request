<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import type { Story } from '@/types/lesson'
import { createTalkVoice, readSoundOn, writeSoundOn } from '@/utils/talkSound'
import { STORY_ADVANCE_COOLDOWN_MS, STORY_TYPE_MS } from './storyDialog'

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
// 略過故事 waits out only this first cooldown (the same double tap must not skip the whole
// story), not the per-line ones: a deliberate skip right after 下一段 should work.
const settled = ref(false)
const settleTimer = setTimeout(() => (settled.value = true), STORY_ADVANCE_COOLDOWN_MS)

const line = computed(() => props.story.lines[index.value]!)
const speaker = computed(() => props.story.characters.find((c) => c.id === line.value.speaker))
const isLast = computed(() => index.value === props.story.lines.length - 1)

// Each speaker gets a name-tag colour and a voice pitch, by order in the story's cast.
const TONES = [
  { tag: 'bg-explore text-on-accent', border: 'border-explore', pitch: 520 },
  { tag: 'bg-bio text-on-accent', border: 'border-bio', pitch: 780 },
] as const
const tone = computed(() => {
  const i = props.story.characters.findIndex((c) => c.id === line.value.speaker)
  return TONES[Math.max(i, 0) % TONES.length]!
})

// Typewriter (Human request 2026-11-13). Screen readers get the whole line at once from the
// live region; only the visible bubble types out.
const chars = computed(() => Array.from(line.value.text))
const shown = ref(0)
const typing = computed(() => shown.value < chars.value.length)
const typed = computed(() => chars.value.slice(0, shown.value).join(''))
let typeTimer: ReturnType<typeof setInterval> | undefined

const soundOn = ref(readSoundOn())
const voice = createTalkVoice()

const reduceMotion = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

function finishLine() {
  clearInterval(typeTimer)
  shown.value = chars.value.length
}

function typeLine() {
  clearInterval(typeTimer)
  shown.value = 0
  if (reduceMotion()) return finishLine()
  typeTimer = setInterval(() => {
    shown.value++
    // A blip every other letter, none for punctuation: chatter, not a buzz.
    const c = chars.value[shown.value - 1] ?? ''
    if (soundOn.value && shown.value % 2 === 1 && /[\p{L}\p{N}]/u.test(c)) {
      voice.blip(tone.value.pitch)
    }
    if (!typing.value) clearInterval(typeTimer)
  }, STORY_TYPE_MS)
}
watch(index, typeLine)
typeLine()

onBeforeUnmount(() => {
  clearTimeout(timer)
  clearTimeout(settleTimer)
  clearInterval(typeTimer)
  voice.close()
})

function toggleSound() {
  soundOn.value = !soundOn.value
  writeSoundOn(soundOn.value)
  // Sample blip; also lets the browser start audio inside this click.
  if (soundOn.value) voice.blip(tone.value.pitch)
}

function next() {
  if (!ready.value) return
  // First press while typing shows the whole line; the cooldown then stops the same
  // double click from also skipping it.
  if (typing.value) {
    finishLine()
    startCooldown()
    return
  }
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

/** Human request (2026-11-12): skip the story and the mission card, straight to 探險者訓練. */
function skip() {
  if (!settled.value || completed.value) return
  completed.value = true
  emit('complete')
}

function start() {
  if (!ready.value || completed.value) return
  completed.value = true
  emit('complete')
}
</script>

<template>
  <!-- tabindex: LessonView moves focus here after the part choice (the clicked button is gone). -->
  <section data-testid="story-dialog" aria-label="故事對話" tabindex="-1" class="space-y-4">
    <BaseCard v-if="!showMission" as="div" highlight="explore" class="space-y-4">
      <p data-testid="story-line" aria-live="polite" aria-atomic="true" class="sr-only">
        {{ speaker?.name }}：{{ line.text }}
      </p>
      <div aria-hidden="true" class="flex items-end gap-3 pt-3">
        <span
          data-testid="story-avatar"
          :class="['shrink-0 text-5xl leading-none', typing && 'motion-safe:animate-talk']"
          >{{ speaker?.avatar }}</span
        >
        <div
          :class="[
            'relative min-w-0 flex-1 rounded-card border-2 bg-surface-2 px-4 pt-5 pb-7',
            tone.border,
          ]"
        >
          <span
            data-testid="story-name"
            :class="['absolute -top-3.5 left-4 rounded-pill px-3 text-sm font-bold', tone.tag]"
            >{{ speaker?.name }}</span
          >
          <!-- The full line, invisible, holds the bubble's height while the text types out. -->
          <p class="grid text-lg">
            <span class="invisible col-start-1 row-start-1">{{ line.text }}</span>
            <span data-testid="story-typed" class="col-start-1 row-start-1">{{ typed }}</span>
          </p>
          <span
            v-if="!typing"
            data-testid="story-more"
            class="absolute right-4 bottom-1.5 text-reward motion-safe:animate-nudge"
            >▼</span
          >
        </div>
      </div>
      <!-- 下一段 first: the first Tab must not land on 略過故事 (review I1); wraps on narrow phones. -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="text-sm text-muted">{{ index + 1 }} / {{ story.lines.length }}</span>
        <span class="flex flex-wrap items-center justify-end gap-2">
          <BaseButton data-testid="story-next" class="whitespace-nowrap" @click="next">
            {{ isLast ? '查看任務' : '下一段' }} →
          </BaseButton>
          <BaseButton
            data-testid="story-skip"
            variant="ghost"
            class="whitespace-nowrap"
            @click="skip"
          >
            略過故事<span aria-hidden="true"> ⏭</span>
          </BaseButton>
          <BaseButton
            data-testid="story-sound"
            variant="ghost"
            class="whitespace-nowrap"
            :aria-pressed="soundOn"
            @click="toggleSound"
          >
            <span aria-hidden="true">{{ soundOn ? '🔈' : '🔇' }}</span
            >說話音效
          </BaseButton>
        </span>
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
