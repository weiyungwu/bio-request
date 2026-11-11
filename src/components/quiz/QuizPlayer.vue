<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import QuizQuestion from '@/components/quiz/QuizQuestion.vue'
import { useQuizStore } from '@/stores/quiz'
import { submitBlocker } from '@/utils/quiz'

/**
 * The current attempt's question, progress and 提交／下一題 buttons, shared by the stage
 * quiz and 弱點練習. `round` changes per start, so the question remounts (and takes focus)
 * even when the index stays 0.
 */
defineProps<{ round: number }>()
const emit = defineEmits<{ next: [] }>()

const quiz = useQuizStore()
const remaining = computed(() => quiz.questions.length - quiz.index - (quiz.isSubmitted ? 1 : 0))
const submitHint = computed(() => submitBlocker(quiz.response))
</script>

<template>
  <BaseCard
    v-if="!quiz.finished && quiz.current"
    as="section"
    class="space-y-5"
    aria-label="測驗題目"
  >
    <div class="space-y-2">
      <p data-testid="quiz-progress" class="text-sm font-semibold text-muted">
        第 {{ quiz.index + 1 }} / {{ quiz.questions.length }} 題 · 還剩 {{ remaining }} 題
      </p>
      <ProgressBar
        :value="quiz.index + (quiz.isSubmitted ? 1 : 0)"
        :max="quiz.questions.length"
        label="作答進度"
      />
    </div>

    <QuizQuestion
      :key="`${round}-${quiz.index}`"
      :question="quiz.current"
      :response="quiz.response"
      :submitted="quiz.isSubmitted"
      @choose="quiz.choose"
    />

    <div v-if="!quiz.isSubmitted" class="flex flex-wrap items-center gap-3">
      <BaseButton
        data-testid="quiz-submit"
        :disabled="submitHint !== ''"
        aria-describedby="quiz-submit-hint"
        @click="quiz.submit"
      >
        提交答案
      </BaseButton>
      <p id="quiz-submit-hint" data-testid="quiz-submit-hint" class="text-sm text-muted">
        {{ submitHint }}
      </p>
    </div>
    <BaseButton v-else data-testid="quiz-next" @click="emit('next')">
      {{ quiz.index < quiz.questions.length - 1 ? '下一題 →' : '看成績 →' }}
    </BaseButton>
  </BaseCard>
</template>
