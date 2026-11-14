<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import type { KnowledgePoint } from '@/types/lesson'
import { shuffle } from '@/utils/shuffle'
import { MEMORY_PREVIEW_MS } from './memoryGame'

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

// Human request (2026-11-15): show the whole deck face up for a moment before play starts,
// so there's something to actually memorise. Cards aren't clickable meanwhile.
const previewing = ref(true)
let previewTimer: ReturnType<typeof setTimeout> | undefined
function startPreview() {
  clearTimeout(previewTimer)
  previewing.value = true
  previewTimer = setTimeout(() => (previewing.value = false), MEMORY_PREVIEW_MS)
}
onBeforeUnmount(() => clearTimeout(previewTimer))
startPreview()

function start() {
  deck.value = buildDeck()
  matched.value = new Set()
  selected.value = []
  mismatch.value = null
  wrongCount.value = 0
  startPreview()
}

// Single source of truth for a card's actual game state (not what it looks like right now —
// see viewState for that), so "matched" and "selected, awaiting a second pick" (review
// finding: both were plain face-up text, told apart only by colour) each get their own marker
// and aria-label text, and `mismatch?.includes(...)` (which is undefined, not false, with no
// mismatch) is read in exactly one place.
type CardState = 'matched' | 'mismatched' | 'selected' | 'facedown'
function cardState(card: Card): CardState {
  if (matched.value.has(card.pointId)) return 'matched'
  if (mismatch.value?.includes(card.id)) return 'mismatched'
  if (selected.value.includes(card.id)) return 'selected'
  return 'facedown'
}

// What the card actually renders as: during the opening preview every card shows face up
// (cardState is always 'facedown' then, since pick() can't run yet), otherwise it's cardState.
type ViewState = CardState | 'preview'
function viewState(card: Card): ViewState {
  return previewing.value ? 'preview' : cardState(card)
}

function cardLabel(card: Card) {
  const point = pointById.value.get(card.pointId)
  return card.kind === 'icon' ? (point?.icon ?? '') : (point?.term.zh ?? card.pointId)
}

const MARKERS: Record<Exclude<ViewState, 'facedown' | 'preview'>, string> = {
  matched: '✓',
  mismatched: '✗',
  selected: '▶',
}
const STATE_WORDS: Record<Exclude<ViewState, 'facedown'>, string> = {
  matched: '，已配對',
  mismatched: '，不是一對',
  selected: '',
  preview: '',
}
function cardAriaLabel(card: Card, i: number) {
  const state = viewState(card)
  if (state === 'facedown') return `卡片 ${i + 1}，蓋著`
  return `卡片 ${i + 1}：${cardLabel(card)}${STATE_WORDS[state]}`
}
/** Visual-only (aria-hidden) marker so matched/mismatched/selected never rely on colour alone. */
function marker(card: Card) {
  const state = viewState(card)
  return state === 'facedown' || state === 'preview' ? '' : MARKERS[state]
}

function pick(card: Card) {
  // A pending mismatch must be dismissed (繼續) before picking again — no auto-flip-back,
  // so the reason stays on screen until the student is done reading it. Cards aren't
  // clickable during the opening preview either.
  if (
    previewing.value ||
    mismatch.value ||
    matched.value.has(card.pointId) ||
    selected.value.includes(card.id)
  ) {
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
  // Review finding: the 繼續 button removed itself from the DOM here with nothing to pick up
  // focus, dropping keyboard/screen-reader users back to <body>.
  nextTick(() => titleEl.value?.focus())
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
      <p
        v-if="previewing"
        data-testid="memory-preview-notice"
        aria-live="polite"
        class="text-sm font-semibold text-explore"
      >
        先記住每張卡片的位置，馬上蓋牌…
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
        :aria-pressed="viewState(card) !== 'facedown'"
        :aria-disabled="viewState(card) === 'matched' || previewing"
        :aria-label="cardAriaLabel(card, i)"
        :class="[
          'flex aspect-square min-h-11 items-center justify-center gap-1 rounded-control border font-semibold transition-colors motion-reduce:transition-none',
          {
            matched: 'cursor-default border-success/60 bg-success/10 text-success',
            mismatched: 'border-danger bg-danger/15 text-danger-text',
            selected: 'border-reward bg-reward/15 text-reward ring-2 ring-reward',
            preview: 'cursor-default border-explore/50 bg-surface-2 text-text',
            facedown: 'border-border text-muted hover:border-explore',
          }[viewState(card)],
        ]"
        @click="pick(card)"
      >
        <template v-if="viewState(card) !== 'facedown'">
          <span aria-hidden="true" class="text-sm">{{ marker(card) }}</span>
          <span :class="card.kind === 'icon' ? 'text-4xl' : 'text-sm'">{{ cardLabel(card) }}</span>
        </template>
        <span v-else aria-hidden="true" class="text-2xl">?</span>
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
