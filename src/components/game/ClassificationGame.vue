<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import type { CellCategory, ClassificationItem, KnowledgePoint } from '@/types/lesson'
import { shuffle } from '@/utils/shuffle'

const props = defineProps<{
  items: ClassificationItem[]
  /** Knowledge points that give each structure its name. */
  points: KnowledgePoint[]
}>()

const categories: { id: CellCategory; label: string }[] = [
  { id: 'plant', label: '植物細胞' },
  { id: 'animal', label: '動物細胞' },
  { id: 'both', label: '兩者皆有' },
]
const labelOf = (c: CellCategory) => categories.find((x) => x.id === c)!.label

const pointById = computed(() => new Map(props.points.map((p) => [p.id, p])))
const nameOf = (id: string) => pointById.value.get(id)?.term.zh ?? id

// One structure at a time, in a new order each round.
const order = ref<ClassificationItem[]>([])
const index = ref(0)
// One answer per structure: once answered it can't be changed or counted again.
const answers = ref(new Map<string, CellCategory>())
const current = computed(() => order.value[index.value])
const answer = computed(() =>
  current.value ? answers.value.get(current.value.pointId) : undefined,
)
const correctCount = computed(
  () => props.items.filter((it) => answers.value.get(it.pointId) === it.category).length,
)

const titleEl = ref<HTMLElement | null>(null)
const itemEl = ref<HTMLElement | null>(null)
const resultHeading = ref<HTMLElement | null>(null)
const showResult = ref(false)

function start() {
  order.value = shuffle(props.items)
  index.value = 0
  answers.value = new Map()
  showResult.value = false
}
start()
// Mounted only when the student moves on from the matching game, so focus follows.
onMounted(() => titleEl.value?.focus())

function choose(category: CellCategory) {
  if (!current.value || answer.value) return
  answers.value.set(current.value.pointId, category)
}

function next() {
  if (!answer.value) return
  if (index.value < order.value.length - 1) {
    index.value++
    nextTick(() => itemEl.value?.focus())
  } else {
    showResult.value = true
    nextTick(() => resultHeading.value?.focus())
  }
}

function retry() {
  start()
  nextTick(() => itemEl.value?.focus())
}

// The chosen and the correct button are marked with ✗ / ✓, not colour alone.
function marker(c: CellCategory) {
  if (!answer.value || !current.value) return ''
  if (c === current.value.category) return '✓'
  return c === answer.value ? '✗' : ''
}

const choiceClass = (c: CellCategory) => {
  const base =
    'flex min-h-11 w-full items-center justify-center gap-2 rounded-control border px-4 py-2 font-semibold transition-colors motion-reduce:transition-none'
  if (!answer.value) return [base, 'border-border text-text hover:border-explore']
  if (c === current.value?.category) return [base, 'cursor-default border-success text-success']
  if (c === answer.value) return [base, 'cursor-default border-danger text-danger-text']
  return [base, 'cursor-default border-border text-muted']
}
</script>

<template>
  <BaseCard as="section" class="space-y-5" aria-labelledby="classification-title">
    <div class="space-y-1">
      <h3 id="classification-title" ref="titleEl" tabindex="-1">植物還是動物？</h3>
      <p class="text-muted">這個構造出現在植物細胞、動物細胞，還是兩者皆有？</p>
    </div>

    <template v-if="!showResult && current">
      <p
        id="classification-progress"
        data-testid="classification-progress"
        class="text-sm font-semibold text-muted"
      >
        第 {{ index + 1 }} / {{ order.length }} 題
      </p>
      <p
        id="classification-item"
        ref="itemEl"
        tabindex="-1"
        aria-describedby="classification-progress"
        data-testid="classification-item"
        class="text-center text-2xl font-bold"
      >
        {{ nameOf(current.pointId) }}
      </p>

      <div class="grid gap-2 sm:grid-cols-3" role="group" aria-labelledby="classification-item">
        <button
          v-for="c in categories"
          :key="c.id"
          type="button"
          data-testid="classification-choice"
          :data-category="c.id"
          :aria-disabled="answer !== undefined"
          :class="choiceClass(c.id)"
          @click="choose(c.id)"
        >
          <span v-if="marker(c.id)" aria-hidden="true">{{ marker(c.id) }}</span>
          <span
            >{{ c.label
            }}<span v-if="answer && c.id === current.category" class="sr-only">（正確答案）</span
            ><span v-if="answer && c.id === answer && c.id !== current.category" class="sr-only"
              >（你的答案）</span
            ></span
          >
        </button>
      </div>

      <div data-testid="classification-feedback" aria-live="polite">
        <div
          v-if="answer"
          :key="current.pointId"
          :class="[
            'rounded-control border-l-4 px-4 py-3',
            answer === current.category
              ? 'border-success bg-success/10'
              : 'border-danger bg-danger/15',
          ]"
        >
          <p v-if="answer === current.category" class="font-bold text-success">
            ✓ 答對了！正確答案是「{{ labelOf(current.category) }}」。
          </p>
          <p v-else class="font-bold text-danger-text">
            ✗ 不對喔，正確答案是「{{ labelOf(current.category) }}」。
          </p>
          <!-- The headline only names the bucket; the Human-checked explanation states the
               facts. A generated "植物細胞有葉綠體" overgeneralises (Phase 3 review I-01), and
               "不是「動物細胞」" reads as "animal cells lack it" (TASK-009 review I1). -->
          <p>{{ current.explanation }}</p>
        </div>
      </div>

      <BaseButton v-if="answer" data-testid="classification-next" @click="next">
        {{ index < order.length - 1 ? '下一個構造 →' : '看結果 →' }}
      </BaseButton>
    </template>

    <section
      v-else-if="showResult"
      data-testid="classification-result"
      class="space-y-3"
      aria-labelledby="classification-result-title"
    >
      <h3 id="classification-result-title" ref="resultHeading" tabindex="-1">分類完成！</h3>
      <p data-testid="classification-summary">
        {{ items.length }} 個構造答對 {{ correctCount }} 個{{
          correctCount === items.length ? '，全部正確！' : '。'
        }}
      </p>
      <h4 class="text-sm font-semibold text-explore">完整解析</h4>
      <ul class="space-y-3">
        <li
          v-for="it in order"
          :key="it.pointId"
          data-testid="classification-review"
          :data-id="it.pointId"
          class="rounded-control border border-border px-4 py-3"
        >
          <p class="font-semibold">
            <span
              aria-hidden="true"
              :class="answers.get(it.pointId) === it.category ? 'text-success' : 'text-danger-text'"
              >{{ answers.get(it.pointId) === it.category ? '✓' : '✗' }}</span
            >
            <span class="sr-only">{{
              answers.get(it.pointId) === it.category ? '答對' : '答錯'
            }}</span>
            {{ nameOf(it.pointId) }}　正確答案：{{ labelOf(it.category) }}
          </p>
          <p v-if="answers.get(it.pointId) !== it.category" class="text-sm text-danger-text">
            你的答案：{{ labelOf(answers.get(it.pointId)!) }}
          </p>
          <p class="text-sm text-muted">{{ it.explanation }}</p>
        </li>
      </ul>
      <div class="flex flex-wrap gap-3">
        <!-- What comes next is the parent's call (map now; the quiz from TASK-011). -->
        <slot name="next" />
        <BaseButton data-testid="classification-retry" variant="secondary" @click="retry">
          ↺ 重新挑戰
        </BaseButton>
      </div>
    </section>
  </BaseCard>
</template>
