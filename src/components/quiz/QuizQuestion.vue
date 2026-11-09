<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import BaseTag from '@/components/common/BaseTag.vue'
import type { Question } from '@/types/question'
import { correctAnswerText, isCorrect, type QuizResponse } from '@/utils/quiz'

const props = withDefaults(
  defineProps<{
    question: Question
    response: QuizResponse
    submitted: boolean
    /** Keeps ids unique when several questions are on one page (錯題本). */
    idPrefix?: string
    headingLevel?: 'h2' | 'h3'
  }>(),
  { idPrefix: 'quiz', headingLevel: 'h2' },
)
const emit = defineEmits<{ choose: [slot: number, value: number | null] }>()

const heading = ref<HTMLElement | null>(null)
const feedbackEl = ref<HTMLElement | null>(null)
// The parent remounts this per question (:key), so focus lands on the new question.
onMounted(() => heading.value?.focus())
// The submit button disappears on submit; move focus to the verdict so it is read out.
watch(
  () => props.submitted,
  (now) => now && nextTick(() => feedbackEl.value?.focus()),
)

const letter = (i: number) => String.fromCharCode(65 + i)
const correct = computed(() => isCorrect(props.question, props.response))
const difficultyLabel = { easy: '簡單', medium: '中等', hard: '困難' } as const

/** Slots answered with a list of selects: matching (left items) or ordering (positions). */
const rows = computed(() => {
  const q = props.question
  if (q.type === 'matching')
    return {
      labels: q.options.left,
      choices: q.options.right,
      key: q.answer,
    }
  if (q.type === 'ordering')
    return {
      labels: q.options.map((_, i) => `第 ${i + 1} 個`),
      choices: q.options,
      key: q.answer,
    }
  return null
})

// Single choice / true-false: options are buttons, like the stage 1 games.
const choiceOptions = computed(() =>
  props.question.type === 'single_choice' || props.question.type === 'true_false'
    ? props.question.options
    : [],
)
const chosen = computed(() => props.response[0])
const keyed = computed(() =>
  props.question.type === 'single_choice' || props.question.type === 'true_false'
    ? props.question.answer
    : -1,
)

// Before submit: letter, or ▶ when chosen. After: ✓ on the key, ✗ on a wrong pick.
function marker(i: number) {
  if (!props.submitted) return chosen.value === i ? '▶' : `${letter(i)}.`
  if (i === keyed.value) return '✓'
  return chosen.value === i ? '✗' : `${letter(i)}.`
}

function optionClass(i: number) {
  const base =
    'flex min-h-11 w-full items-start gap-2 rounded-control border px-4 py-2 text-left font-semibold transition-colors motion-reduce:transition-none'
  if (props.submitted) {
    if (i === keyed.value) return [base, 'cursor-default border-success text-success']
    if (chosen.value === i) return [base, 'cursor-default border-danger text-danger-text']
    return [base, 'cursor-default border-border text-muted']
  }
  return chosen.value === i
    ? [base, 'border-reward bg-reward/15 text-reward ring-2 ring-reward']
    : [base, 'border-border text-text hover:border-explore']
}

function pick(i: number) {
  if (props.submitted) return
  // Tapping the chosen option again clears it (aria-pressed toggle).
  emit('choose', 0, chosen.value === i ? null : i)
}

function onSelect(slot: number, event: Event) {
  const v = (event.target as HTMLSelectElement).value
  emit('choose', slot, v === '' ? null : Number(v))
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-2">
      <BaseTag tone="explore">{{ question.topic }}</BaseTag>
      <BaseTag>{{ difficultyLabel[question.difficulty] }}</BaseTag>
      <BaseTag v-if="question.type === 'true_false'">是非題</BaseTag>
      <BaseTag v-else-if="question.type === 'matching'">配對題</BaseTag>
      <BaseTag v-else-if="question.type === 'ordering'">排序題</BaseTag>
    </div>
    <component
      :is="headingLevel"
      :id="`${idPrefix}-question`"
      ref="heading"
      tabindex="-1"
      data-testid="quiz-question"
      class="text-xl"
    >
      {{ question.question }}
    </component>

    <div v-if="!rows" class="space-y-2" role="group" :aria-labelledby="`${idPrefix}-question`">
      <button
        v-for="(text, i) in choiceOptions"
        :key="text"
        type="button"
        data-testid="quiz-option"
        :data-index="i"
        :aria-pressed="chosen === i"
        :aria-disabled="submitted"
        :class="optionClass(i)"
        @click="pick(i)"
      >
        <span aria-hidden="true">{{ marker(i) }}</span>
        <span>
          {{ text }}
          <span v-if="submitted && i === keyed" class="text-sm font-normal">（正確答案）</span>
          <span v-else-if="submitted && chosen === i" class="text-sm font-normal"
            >（你的答案）</span
          >
        </span>
      </button>
    </div>

    <ol v-else class="space-y-3">
      <li
        v-for="(label, slot) in rows.labels"
        :key="label"
        data-testid="quiz-row"
        class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:items-center"
      >
        <label :for="`${idPrefix}-slot-${slot}`" class="font-semibold">{{ label }}</label>
        <div class="space-y-1">
          <select
            :id="`${idPrefix}-slot-${slot}`"
            data-testid="quiz-select"
            :aria-describedby="`${idPrefix}-question`"
            :value="response[slot] ?? ''"
            :disabled="submitted"
            class="min-h-11 w-full rounded-control border border-border bg-surface px-3 text-text disabled:opacity-80"
            @change="onSelect(slot, $event)"
          >
            <option value="">請選擇</option>
            <option v-for="(choice, i) in rows.choices" :key="choice" :value="i">
              {{ letter(i) }}. {{ choice }}
            </option>
          </select>
          <p
            v-if="submitted"
            :class="response[slot] === rows.key[slot] ? 'text-success' : 'text-danger-text'"
            class="text-sm font-semibold"
          >
            <template v-if="response[slot] === rows.key[slot]">✓ 正確</template>
            <template v-else>✗ 正確是：{{ rows.choices[rows.key[slot]!] }}</template>
          </p>
        </div>
      </li>
    </ol>

    <div
      v-if="submitted"
      ref="feedbackEl"
      tabindex="-1"
      data-testid="quiz-feedback"
      :class="[
        'space-y-1 rounded-control border-l-4 px-4 py-3',
        correct ? 'border-success bg-success/10' : 'border-danger bg-danger/15',
      ]"
    >
      <p v-if="correct" class="font-bold text-success">✓ 答對了！</p>
      <p v-else class="font-bold text-danger-text">✗ 答錯了</p>
      <p><span class="font-semibold">正確答案：</span>{{ correctAnswerText(question) }}</p>
      <p><span class="font-semibold">解析：</span>{{ question.explanation }}</p>
    </div>
  </div>
</template>
