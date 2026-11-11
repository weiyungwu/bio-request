<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import type { Lesson, LessonPart } from '@/types/lesson'
import KnowledgeCard from './KnowledgeCard.vue'
import ImportantNote from './ImportantNote.vue'
import { STORY_ADVANCE_COOLDOWN_MS } from './storyDialog'

const props = withDefaults(
  defineProps<{
    lessons: Lesson[]
    /** 上篇／下篇: a rest screen comes between parts. */
    parts?: LessonPart[]
    /** Index into `parts` to start reading from; earlier parts cannot be reached with 上一個. */
    startPart?: number
  }>(),
  { parts: () => [], startPart: 0 },
)
const emit = defineEmits<{
  complete: []
  /** The last point of a unit was read (TASK-015: 完成一個知識單元). Repeats are harmless. */
  'unit-complete': [lessonId: string]
}>()

// All knowledge points in reading order; index === points.length is the summary.
const points = computed(() =>
  props.lessons.flatMap((lesson, unitIndex) =>
    lesson.knowledgePoints.map((point) => ({ point, lesson, unitIndex })),
  ),
)
// Point index where each part begins.
const partStarts = computed(() =>
  props.parts.map((part) => points.value.findIndex((p) => p.lesson.id === part.lessonIds[0])),
)
// Read once: LessonView mounts the card after the part is chosen and remounts it per course.
// A part whose first unit is missing (-1) falls back to the start.
const start = Math.max(0, partStarts.value[props.startPart] ?? 0)
const index = ref(start)
// While set, the rest screen after part `resting - 1` shows; `index` is already on part `resting`.
const resting = ref<number | null>(null)
const current = computed(() => (resting.value === null ? points.value[index.value] : undefined))
const onSummary = computed(() => index.value >= points.value.length)
const done = ref(false)
const forwardButton = ref<{ $el: HTMLElement } | null>(null)

const unitLabel = (unitIndex: number) => `單元 ${String.fromCharCode(65 + unitIndex)}`

// The forward button becomes 下一步 on the summary; ignore it briefly so a
// double tap or held Enter on the last point cannot skip 重點整理.
const summaryReady = ref(false)
let summaryTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(summaryTimer))

function forward() {
  if (resting.value !== null) {
    resting.value = null
    return
  }
  if (onSummary.value) {
    if (summaryReady.value) finish()
    return
  }
  const left = current.value
  index.value++
  if (left && points.value[index.value]?.unitIndex !== left.unitIndex) {
    emit('unit-complete', left.lesson.id)
  }
  const part = partStarts.value.indexOf(index.value)
  if (part > 0) resting.value = part
  if (onSummary.value) {
    summaryReady.value = false
    clearTimeout(summaryTimer)
    summaryTimer = setTimeout(() => (summaryReady.value = true), STORY_ADVANCE_COOLDOWN_MS)
  }
}

function back() {
  resting.value = null
  index.value--
  // 上一個 becomes disabled on the first point and would drop focus to <body>.
  if (index.value === start) nextTick(() => forwardButton.value?.$el.focus())
}

function finish() {
  if (done.value) return
  done.value = true
  emit('complete')
}
</script>

<template>
  <BaseCard as="section" class="space-y-5" aria-label="知識教學">
    <div class="space-y-2">
      <p data-testid="lesson-position" aria-live="polite" class="text-sm font-semibold text-muted">
        <!-- The whole message, since focus stays on the forward button. -->
        <template v-if="resting !== null"
          >{{ parts[resting - 1]!.name }}完成，可以先休息一下</template
        >
        <template v-else-if="current">
          {{ unitLabel(current.unitIndex) }}：{{ current.lesson.title }}・{{ index + 1 }} /
          {{ points.length }}：{{ current.point.term.zh }}
        </template>
        <template v-else>重點整理</template>
      </p>
      <ProgressBar
        :value="resting === null ? Math.min(index + 1, points.length) : index"
        :max="points.length"
        label="知識點進度"
      />
    </div>

    <div v-if="resting !== null" data-testid="lesson-rest" class="space-y-3">
      <h3>🎉 {{ parts[resting - 1]!.name }}完成！</h3>
      <p>
        你已經讀完「{{
          parts[resting - 1]!.title
        }}」。可以先休息一下；下次進入這一關時，選「直接看{{ parts[resting]!.name }}」，就能從「{{
          parts[resting]!.title
        }}」接著讀。
      </p>
      <p class="text-sm text-muted">要休息的話，按頁面上方的「← 回關卡地圖」。</p>
    </div>

    <KnowledgeCard v-else-if="current" :key="current.point.id" :point="current.point" />

    <div v-else data-testid="lesson-summary" class="space-y-4">
      <h3>重點整理</h3>
      <p class="text-muted">考試前再看一次這些必背觀念：</p>
      <div v-for="(lesson, unitIndex) in lessons" :key="lesson.id" class="space-y-2">
        <h4>{{ unitLabel(unitIndex) }}：{{ lesson.title }}</h4>
        <ImportantNote :title="'必背觀念'">
          <ul class="list-disc space-y-1 pl-5">
            <li v-for="point in lesson.knowledgePoints" :key="point.id">
              <span data-testid="summary-term" class="font-semibold whitespace-nowrap">{{
                point.term.zh
              }}</span
              >：{{ point.examTip }}
            </li>
          </ul>
        </ImportantNote>
      </div>
    </div>

    <div class="flex flex-wrap justify-between gap-3">
      <BaseButton
        data-testid="lesson-prev"
        variant="ghost"
        :disabled="index === start && resting === null"
        @click="back"
      >
        ← 上一個
      </BaseButton>
      <!-- One element for next/done so keyboard focus survives entering the summary. -->
      <BaseButton
        ref="forwardButton"
        :data-testid="
          resting !== null ? 'lesson-continue' : onSummary ? 'lesson-done' : 'lesson-next'
        "
        :variant="onSummary ? 'reward' : 'primary'"
        @click="forward"
      >
        <template v-if="resting !== null">繼續看{{ parts[resting]!.name }} →</template>
        <template v-else-if="onSummary">下一步：細胞城市探險 →</template>
        <template v-else>{{ index === points.length - 1 ? '看重點整理' : '下一個' }} →</template>
      </BaseButton>
    </div>
  </BaseCard>
</template>
