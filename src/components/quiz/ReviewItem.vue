<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTag from '@/components/common/BaseTag.vue'
import QuizQuestion from '@/components/quiz/QuizQuestion.vue'
import { useProgressStore } from '@/stores/progress'
import { isRetriedCorrect, type WrongQuestion } from '@/types/progress'
import type { Question } from '@/types/question'
import {
  correctAnswerText,
  emptyResponse,
  isCorrect,
  submitBlocker,
  type QuizResponse,
} from '@/utils/quiz'

const props = defineProps<{ entry: WrongQuestion; question: Question }>()
const progress = useProgressStore()

const showAnswer = ref(false)
// One retry at a time: answering → submitted; 再作答一次 starts a clean one.
const retrying = ref(false)
// Bumped per retry: QuizQuestion remounts and takes focus, also on 再作答一次 (review I3).
const attempt = ref(0)
const titleEl = ref<HTMLElement | null>(null)
const response = ref<QuizResponse>([])
const submitted = ref(false)
const hint = computed(() => submitBlocker(response.value))
const prefix = computed(() => `review-${props.question.id}`)

function startRetry() {
  showAnswer.value = false
  response.value = emptyResponse(props.question)
  submitted.value = false
  retrying.value = true
  attempt.value++
}
// 完成 removes itself; land on the question again instead of the page top (review I3).
function closeRetry() {
  retrying.value = false
  nextTick(() => titleEl.value?.focus())
}
function choose(slot: number, value: number | null) {
  if (!submitted.value) response.value[slot] = value
}
function submit() {
  if (submitted.value || hint.value) return
  submitted.value = true
  progress.recordReviewAnswer(props.question.id, isCorrect(props.question, response.value))
}
</script>

<template>
  <li
    data-testid="review-item"
    :data-id="question.id"
    class="space-y-3 rounded-control border border-border px-4 py-3"
  >
    <div class="flex flex-wrap gap-2">
      <BaseTag tone="explore">{{ question.topic }}</BaseTag>
      <BaseTag v-if="entry.mastered" data-testid="review-status" tone="success">✓ 已熟悉</BaseTag>
      <BaseTag v-else data-testid="review-status" tone="reward">待複習</BaseTag>
      <BaseTag
        v-if="isRetriedCorrect(entry) && !entry.mastered"
        data-testid="review-retried"
        tone="success"
        >✓ 已重新答對</BaseTag
      >
    </div>

    <template v-if="!retrying">
      <h3 ref="titleEl" tabindex="-1" class="text-base">{{ question.question }}</h3>
      <div v-if="showAnswer" data-testid="review-answer" class="space-y-1 text-sm">
        <p><span class="font-semibold">正確答案：</span>{{ correctAnswerText(question) }}</p>
        <p><span class="font-semibold">解析：</span>{{ question.explanation }}</p>
      </div>
    </template>
    <div v-else class="space-y-3">
      <QuizQuestion
        :key="attempt"
        :question="question"
        :response="response"
        :submitted="submitted"
        :id-prefix="prefix"
        heading-level="h3"
        @choose="choose"
      />
      <div v-if="!submitted" class="flex flex-wrap items-center gap-3">
        <BaseButton
          data-testid="review-submit"
          :disabled="hint !== ''"
          :aria-describedby="`${prefix}-hint`"
          @click="submit"
        >
          提交答案
        </BaseButton>
        <p :id="`${prefix}-hint`" class="text-sm text-muted">{{ hint }}</p>
      </div>
      <p v-else-if="isCorrect(question, response) && !entry.mastered" class="text-sm text-muted">
        答對了！如果已經學會，可以把這題標記為已熟悉。
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <BaseButton
        v-if="!retrying"
        data-testid="review-toggle-answer"
        variant="ghost"
        :aria-expanded="showAnswer"
        @click="showAnswer = !showAnswer"
      >
        {{ showAnswer ? '收起答案' : '查看答案與解析' }}
      </BaseButton>
      <BaseButton
        v-if="!retrying || submitted"
        data-testid="review-retry"
        variant="secondary"
        @click="startRetry"
      >
        {{ retrying ? '↺ 再作答一次' : '重新作答' }}
      </BaseButton>
      <BaseButton
        v-if="retrying && submitted"
        data-testid="review-close"
        variant="ghost"
        @click="closeRetry"
      >
        完成
      </BaseButton>
      <BaseButton
        data-testid="review-mastered"
        variant="ghost"
        @click="progress.setMastered(question.id, !entry.mastered)"
      >
        {{ entry.mastered ? '取消已熟悉' : '標記已熟悉' }}
      </BaseButton>
    </div>
  </li>
</template>
