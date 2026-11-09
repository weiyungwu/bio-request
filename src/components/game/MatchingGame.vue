<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import BaseCard from '@/components/common/BaseCard.vue'
import type { KnowledgePoint, MatchingPair } from '@/types/lesson'
import { shuffle } from '@/utils/shuffle'

const props = defineProps<{
  pairs: MatchingPair[]
  /** Knowledge points that give each structure its name and explanation. */
  points: KnowledgePoint[]
}>()

const pointById = computed(() => new Map(props.points.map((p) => [p.id, p])))
const pairById = computed(() => new Map(props.pairs.map((p) => [p.pointId, p])))
const nameOf = (id: string) => pointById.value.get(id)?.term.zh ?? id

// Both columns are keyed by pointId; functions are shuffled so rows don't give the answer away.
const structureIds = computed(() => props.pairs.map((p) => p.pointId))
const functionIds = ref(shuffle(structureIds.value))
const LETTERS = 'ABCDEFGH'

const selectedStructure = ref<string | null>(null)
const selectedFunction = ref<string | null>(null)
// A Set: re-picking a finished pair can never count it twice.
const matched = ref(new Set<string>())
const wrongCount = ref(0)
const feedback = ref<
  { correct: true; id: string } | { correct: false; structure: string; fn: string } | null
>(null)
const finished = computed(() => matched.value.size === props.pairs.length)
const resultHeading = ref<HTMLElement | null>(null)

function pick(column: 'structure' | 'function', id: string) {
  if (matched.value.has(id)) return
  if (column === 'structure') selectedStructure.value = id
  else selectedFunction.value = id

  const structure = selectedStructure.value
  const fn = selectedFunction.value
  if (!structure || !fn) return
  selectedStructure.value = selectedFunction.value = null
  if (structure === fn) {
    matched.value.add(structure)
    feedback.value = { correct: true, id: structure }
    if (finished.value) nextTick(() => resultHeading.value?.focus())
  } else {
    wrongCount.value++
    feedback.value = { correct: false, structure, fn }
  }
}

const choiceClass = (selected: boolean, done: boolean) => [
  'flex min-h-11 w-full items-start gap-2 rounded-control border px-4 py-2 text-left font-semibold transition-colors motion-reduce:transition-none',
  done
    ? 'cursor-default border-success/60 text-success'
    : selected
      ? 'border-reward bg-reward/15 text-reward'
      : 'border-border text-text hover:border-explore',
]
</script>

<template>
  <BaseCard as="section" class="space-y-5" aria-labelledby="matching-title">
    <div class="space-y-1">
      <h3 id="matching-title">細胞器配對</h3>
      <p class="text-muted">先點一個構造，再點它的功能（順序反過來也可以）。</p>
      <p data-testid="matching-progress" class="text-sm font-semibold text-muted">
        已配對 {{ matched.size }} / {{ pairs.length }}
      </p>
    </div>

    <div class="grid gap-5 sm:grid-cols-2">
      <div class="space-y-2" role="group" aria-label="構造">
        <h4 class="text-sm font-semibold text-explore">構造</h4>
        <button
          v-for="(id, i) in structureIds"
          :key="id"
          type="button"
          data-testid="match-structure"
          :data-id="id"
          :aria-pressed="selectedStructure === id"
          :aria-disabled="matched.has(id)"
          :class="choiceClass(selectedStructure === id, matched.has(id))"
          @click="pick('structure', id)"
        >
          <span aria-hidden="true">{{ matched.has(id) ? '✓' : `${i + 1}.` }}</span>
          <span
            >{{ nameOf(id) }}<span v-if="matched.has(id)" class="sr-only">（已配對）</span></span
          >
        </button>
      </div>

      <div class="space-y-2" role="group" aria-label="功能">
        <h4 class="text-sm font-semibold text-explore">功能</h4>
        <button
          v-for="(id, i) in functionIds"
          :key="id"
          type="button"
          data-testid="match-function"
          :data-id="id"
          :aria-pressed="selectedFunction === id"
          :aria-disabled="matched.has(id)"
          :class="choiceClass(selectedFunction === id, matched.has(id))"
          @click="pick('function', id)"
        >
          <span aria-hidden="true">{{ matched.has(id) ? '✓' : `${LETTERS[i]}.` }}</span>
          <span>
            {{ pairById.get(id)?.function }}
            <span v-if="matched.has(id)" class="block text-sm font-normal">→ {{ nameOf(id) }}</span>
          </span>
        </button>
      </div>
    </div>

    <div data-testid="matching-feedback" aria-live="polite">
      <div
        v-if="feedback?.correct"
        class="rounded-control border-l-4 border-success bg-success/10 px-4 py-3"
      >
        <p class="font-bold text-success">✓ 答對了！</p>
        <p>{{ pointById.get(feedback.id)?.definition }}</p>
      </div>
      <div
        v-else-if="feedback"
        class="rounded-control border-l-4 border-danger bg-danger/15 px-4 py-3"
      >
        <p class="font-bold text-danger-text">
          ✗ 再想想：{{ nameOf(feedback.structure) }}的功能不是「{{
            pairById.get(feedback.fn)?.function
          }}」。
        </p>
        <p>提示：{{ pairById.get(feedback.structure)?.hint }}</p>
      </div>
    </div>

    <section
      v-if="finished"
      data-testid="matching-result"
      class="space-y-3"
      aria-labelledby="matching-result-title"
    >
      <h3 id="matching-result-title" ref="resultHeading" tabindex="-1">配對完成！</h3>
      <p data-testid="matching-summary">
        {{ pairs.length }} 組全部配對成功，{{
          wrongCount === 0 ? '一次都沒有配錯' : `過程中配錯 ${wrongCount} 次`
        }}。
      </p>
      <ul class="list-disc space-y-1 pl-5">
        <li v-for="pair in pairs" :key="pair.pointId">
          <span class="font-semibold whitespace-nowrap">{{ nameOf(pair.pointId) }}</span
          >：{{ pair.function }}
        </li>
      </ul>
    </section>
  </BaseCard>
</template>
