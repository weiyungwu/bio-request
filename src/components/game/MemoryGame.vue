<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import type { KnowledgePoint } from '@/types/lesson'
import { shuffle } from '@/utils/shuffle'

const props = defineProps<{
  /** One pair of cards (icon + name) per point; every point needs a non-empty `icon`. */
  points: KnowledgePoint[]
}>()
const emit = defineEmits<{
  /** All pairs matched (TASK-015: 完成互動小遊戲). The result's `#next` slot moves on. */
  finished: []
}>()

type Kind = 'icon' | 'term'
interface Card {
  id: string
  pointId: string
  kind: Kind
}

const pointById = computed(() => new Map(props.points.map((p) => [p.id, p])))
const buildDeck = () =>
  shuffle(
    props.points.flatMap((p) => [
      { id: `${p.id}-icon`, pointId: p.id, kind: 'icon' } as Card,
      { id: `${p.id}-term`, pointId: p.id, kind: 'term' } as Card,
    ]),
  )

const deck = ref<Card[]>(buildDeck())
const matched = ref(new Set<string>())
// At most 2 ids: the card(s) currently turned face up and not yet resolved as a pair.
const selected = ref<string[]>([])
// Set only on a wrong pair: both cards stay face up, showing why, until 繼續 is pressed.
const mismatch = ref<[string, string] | null>(null)
const wrongCount = ref(0)
const titleEl = ref<HTMLElement | null>(null)
const resultHeading = ref<HTMLElement | null>(null)
const finished = computed(() => matched.value.size === props.points.length)
// Mounted only when the student moves on from classification, so focus follows
// (ClassificationGame does the same for matching -> classification).
onMounted(() => titleEl.value?.focus())

function start() {
  deck.value = buildDeck()
  matched.value = new Set()
  selected.value = []
  mismatch.value = null
  wrongCount.value = 0
}

function faceUp(card: Card) {
  // Boolean(...): `mismatch.value?.includes(...)` is undefined (not false) when there's no
  // mismatch, which would drop the aria-pressed attribute entirely instead of setting "false".
  return Boolean(
    matched.value.has(card.pointId) ||
    selected.value.includes(card.id) ||
    mismatch.value?.includes(card.id),
  )
}

function cardLabel(card: Card) {
  const point = pointById.value.get(card.pointId)
  return card.kind === 'icon' ? (point?.icon ?? '') : (point?.term.zh ?? card.pointId)
}

function pick(card: Card) {
  // A pending mismatch must be dismissed (繼續) before picking again — no auto-flip-back,
  // so the reason stays on screen until the student is done reading it.
  if (mismatch.value || matched.value.has(card.pointId) || selected.value.includes(card.id)) {
    return
  }
  selected.value.push(card.id)
  if (selected.value.length < 2) return
  const [aId, bId] = selected.value as [string, string]
  const a = deck.value.find((c) => c.id === aId)!
  const b = deck.value.find((c) => c.id === bId)!
  selected.value = []
  if (a.pointId === b.pointId) {
    matched.value.add(a.pointId)
    if (finished.value) {
      emit('finished')
      nextTick(() => resultHeading.value?.focus())
    }
  } else {
    wrongCount.value++
    mismatch.value = [aId, bId]
  }
}

function dismiss() {
  mismatch.value = null
}

function retry() {
  start()
  nextTick(() => titleEl.value?.focus())
}
</script>

<template>
  <BaseCard as="section" class="space-y-5" aria-labelledby="memory-title">
    <div class="space-y-1">
      <h3 id="memory-title" ref="titleEl" tabindex="-1">記憶力配對</h3>
      <p class="text-muted">翻開兩張卡片，找出圖示和名稱是同一組的。</p>
      <p data-testid="memory-progress" class="text-sm font-semibold text-muted">
        已配對 {{ matched.size }} / {{ points.length }}
      </p>
    </div>

    <div class="grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label="卡片">
      <button
        v-for="(card, i) in deck"
        :key="card.id"
        type="button"
        data-testid="memory-card"
        :data-pair-id="card.pointId"
        :data-kind="card.kind"
        :aria-pressed="faceUp(card)"
        :aria-disabled="matched.has(card.pointId)"
        :aria-label="faceUp(card) ? `卡片 ${i + 1}：${cardLabel(card)}` : `卡片 ${i + 1}，蓋著`"
        :class="[
          'flex aspect-square min-h-11 items-center justify-center rounded-control border text-2xl font-semibold transition-colors motion-reduce:transition-none',
          matched.has(card.pointId)
            ? 'cursor-default border-success/60 bg-success/10 text-success'
            : faceUp(card)
              ? mismatch?.includes(card.id)
                ? 'border-danger bg-danger/15 text-danger-text'
                : 'border-reward bg-reward/15 text-reward ring-2 ring-reward'
              : 'border-border text-muted hover:border-explore',
        ]"
        @click="pick(card)"
      >
        <span v-if="faceUp(card)" :class="card.kind === 'term' && 'text-base'">{{
          cardLabel(card)
        }}</span>
        <span v-else aria-hidden="true">?</span>
      </button>
    </div>

    <div data-testid="memory-feedback" aria-live="polite">
      <div
        v-if="mismatch"
        class="space-y-2 rounded-control border-l-4 border-danger bg-danger/15 px-4 py-3"
      >
        <p class="font-bold text-danger-text">✗ 這兩張不是一對，再試一次。</p>
        <BaseButton data-testid="memory-dismiss" variant="secondary" size="md" @click="dismiss">
          繼續
        </BaseButton>
      </div>
    </div>

    <section
      v-if="finished"
      data-testid="memory-result"
      class="space-y-3"
      aria-labelledby="memory-result-title"
    >
      <h3 id="memory-result-title" ref="resultHeading" tabindex="-1">記憶力配對完成！</h3>
      <p data-testid="memory-summary">
        {{ points.length }} 組全部配對成功，{{
          wrongCount === 0 ? '一次都沒有翻錯' : `過程中翻錯 ${wrongCount} 次`
        }}。
      </p>
      <ul class="list-disc space-y-1 pl-5">
        <li v-for="p in points" :key="p.id">
          <span aria-hidden="true">{{ p.icon }}</span>
          <span class="font-semibold">{{ p.term.zh }}</span>
        </li>
      </ul>
      <div class="flex flex-wrap gap-3">
        <slot name="next" />
        <BaseButton data-testid="memory-retry" variant="secondary" @click="retry">
          ↺ 重新挑戰
        </BaseButton>
      </div>
    </section>
  </BaseCard>
</template>
