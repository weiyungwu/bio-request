<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import type { Lesson } from '@/types/lesson'
import KnowledgeCard from './KnowledgeCard.vue'
import ImportantNote from './ImportantNote.vue'

const props = defineProps<{ lessons: Lesson[] }>()
const emit = defineEmits<{ complete: [] }>()

// All knowledge points in reading order; index === points.length is the summary.
const points = computed(() =>
  props.lessons.flatMap((lesson, unitIndex) =>
    lesson.knowledgePoints.map((point) => ({ point, lesson, unitIndex })),
  ),
)
const index = ref(0)
const current = computed(() => points.value[index.value])
const onSummary = computed(() => index.value >= points.value.length)
const done = ref(false)
const forwardButton = ref<{ $el: HTMLElement } | null>(null)

const unitLabel = (unitIndex: number) => `單元 ${String.fromCharCode(65 + unitIndex)}`

function forward() {
  if (onSummary.value) finish()
  else index.value++
}

function back() {
  index.value--
  // 上一個 becomes disabled on point 1 and would drop focus to <body>.
  if (index.value === 0) nextTick(() => forwardButton.value?.$el.focus())
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
        <template v-if="current">
          {{ unitLabel(current.unitIndex) }}：{{ current.lesson.title }}・{{ index + 1 }} /
          {{ points.length }}：{{ current.point.term.zh }}
        </template>
        <template v-else>重點整理</template>
      </p>
      <ProgressBar
        :value="Math.min(index + 1, points.length)"
        :max="points.length"
        label="知識點進度"
      />
    </div>

    <KnowledgeCard v-if="current" :key="current.point.id" :point="current.point" />

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
      <BaseButton data-testid="lesson-prev" variant="ghost" :disabled="index === 0" @click="back">
        ← 上一個
      </BaseButton>
      <!-- One element for next/done so keyboard focus survives entering the summary. -->
      <BaseButton
        ref="forwardButton"
        :data-testid="onSummary ? 'lesson-done' : 'lesson-next'"
        :variant="onSummary ? 'reward' : 'primary'"
        @click="forward"
      >
        <template v-if="onSummary">下一步：互動挑戰 →</template>
        <template v-else>{{ index === points.length - 1 ? '看重點整理' : '下一個' }} →</template>
      </BaseButton>
    </div>
  </BaseCard>
</template>
