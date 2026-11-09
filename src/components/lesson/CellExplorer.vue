<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import type { KnowledgePoint } from '@/types/lesson'

const props = defineProps<{
  /** Knowledge points to explain structures with (unit B). */
  points: KnowledgePoint[]
  /** Knowledge point ids the student must find (FR-02 mission). */
  targets: string[]
}>()
const emit = defineEmits<{ complete: [] }>()

type CellKind = 'plant' | 'animal'
type StructureId =
  'wall' | 'membrane' | 'cytoplasm' | 'nucleus' | 'chloroplast' | 'vacuole' | 'mitochondrion'

const POINT_ID: Record<StructureId, string> = {
  wall: 'b-wall',
  membrane: 'b-membrane',
  cytoplasm: 'b-cytoplasm',
  nucleus: 'b-nucleus',
  chloroplast: 'b-chloroplast',
  vacuole: 'b-vacuole',
  mitochondrion: 'b-mitochondrion',
}

// Chip order = outside in, matching how students read a cell.
const STRUCTURES: Record<CellKind, StructureId[]> = {
  plant: ['wall', 'membrane', 'cytoplasm', 'nucleus', 'chloroplast', 'vacuole', 'mitochondrion'],
  animal: ['membrane', 'cytoplasm', 'nucleus', 'mitochondrion', 'vacuole'],
}
const CELL_NAME: Record<CellKind, string> = { plant: '植物細胞', animal: '動物細胞' }

const pointById = computed(() => new Map(props.points.map((p) => [p.id, p])))
const pointFor = (id: StructureId) => pointById.value.get(POINT_ID[id])

const kind = ref<CellKind>('plant')
const selected = ref<StructureId | null>(null)
const explored = ref<Record<CellKind, Set<StructureId>>>({ plant: new Set(), animal: new Set() })

const selectedPoint = computed(() => (selected.value ? pointFor(selected.value) : undefined))

function select(id: StructureId) {
  selected.value = id
  explored.value[kind.value].add(id)
}

function showCell(next: CellKind) {
  kind.value = next
  selected.value = null
}

function reset() {
  explored.value = { plant: new Set(), animal: new Set() }
  selected.value = null
}

const foundPointIds = computed(
  () =>
    new Set(
      (['plant', 'animal'] as const).flatMap((k) => [...explored.value[k]].map((s) => POINT_ID[s])),
    ),
)
// FR-02 mission: the story's targets, plus 分辨植物細胞與動物細胞 — find in the
// plant cell what the animal cell lacks (wall, chloroplast), and look at the animal cell.
const missionItems = computed(() => [
  ...props.targets.map((id) => ({
    key: id,
    label: `找到${pointById.value.get(id)?.term.zh ?? id}`,
    done: foundPointIds.value.has(id),
  })),
  {
    key: 'plant-only',
    label: '在植物細胞找到細胞壁和葉綠體（動物細胞沒有）',
    done: explored.value.plant.has('wall') && explored.value.plant.has('chloroplast'),
  },
  { key: 'animal', label: '觀察動物細胞', done: explored.value.animal.size > 0 },
])
const remaining = computed(() => missionItems.value.filter((i) => !i.done))

const done = ref(false)
function finish() {
  if (remaining.value.length || done.value) return
  done.value = true
  emit('complete')
}

const hitProps = (id: StructureId) => ({
  'data-structure': id,
  // Cytoplasm is a region whose outline sits under the membrane line: highlight its fill.
  class: [
    'cursor-pointer',
    selected.value === id && (id === 'cytoplasm' ? 'is-selected-fill' : 'is-selected'),
  ],
  onClick: () => select(id),
})

const uid = useId()
const plantInsideId = `${uid}-plant-inside`
const animalInsideId = `${uid}-animal-inside`
const hintId = `${uid}-hint`
const ANIMAL_OUTLINE =
  'M60 120 C55 60 120 28 175 34 C240 40 282 78 272 132 C264 186 210 214 150 208 C92 202 64 172 60 120 Z'
</script>

<template>
  <BaseCard as="section" class="space-y-5" aria-label="細胞互動圖">
    <div class="flex flex-wrap gap-2" role="group" aria-label="選擇細胞">
      <BaseButton
        v-for="k in ['plant', 'animal'] as const"
        :key="k"
        :data-testid="`cell-${k}`"
        :variant="kind === k ? 'primary' : 'secondary'"
        :aria-pressed="kind === k"
        @click="showCell(k)"
      >
        {{ CELL_NAME[k] }}
      </BaseButton>
    </div>

    <div class="grid gap-5 md:grid-cols-2">
      <!-- Pointer convenience only: no text inside; the chips below are the accessible control. -->
      <svg
        viewBox="0 0 320 240"
        aria-hidden="true"
        focusable="false"
        class="w-full rounded-control border border-border bg-bg"
      >
        <template v-if="kind === 'plant'">
          <rect
            v-bind="hitProps('wall')"
            x="34"
            y="24"
            width="252"
            height="192"
            rx="10"
            fill="#a16207"
            stroke="#facc15"
            stroke-width="3"
          />
          <rect
            v-bind="hitProps('cytoplasm')"
            x="48"
            y="38"
            width="224"
            height="164"
            rx="6"
            fill="#1c3a6b"
          />
          <!-- membrane: visible line plus a wide transparent hit area clipped to the
               inside, so it never takes taps from the cell wall band (x 34–48). -->
          <clipPath :id="plantInsideId">
            <rect x="48" y="38" width="224" height="164" rx="6" />
          </clipPath>
          <g v-bind="hitProps('membrane')">
            <rect
              class="hit-area"
              x="48"
              y="38"
              width="224"
              height="164"
              rx="6"
              fill="none"
              stroke="transparent"
              stroke-width="12"
              pointer-events="stroke"
              :clip-path="`url(#${plantInsideId})`"
            />
            <rect
              x="48"
              y="38"
              width="224"
              height="164"
              rx="6"
              fill="none"
              stroke="#2dd4bf"
              stroke-width="3"
              pointer-events="none"
            />
          </g>
          <rect
            v-bind="hitProps('vacuole')"
            x="96"
            y="58"
            width="150"
            height="124"
            rx="40"
            fill="#bfdbfe"
            opacity="0.85"
          />
          <g v-bind="hitProps('nucleus')">
            <circle cx="74" cy="120" r="20" fill="#3b1f6b" stroke="#c4b5fd" stroke-width="3" />
            <circle cx="70" cy="116" r="6" fill="#c4b5fd" opacity="0.8" />
          </g>
          <g v-bind="hitProps('chloroplast')" fill="#22c55e" stroke="#14532d" stroke-width="2">
            <ellipse cx="80" cy="56" rx="13" ry="7" />
            <ellipse cx="150" cy="48" rx="13" ry="7" />
            <ellipse cx="226" cy="48" rx="13" ry="7" />
            <ellipse cx="258" cy="100" rx="7" ry="13" />
            <ellipse cx="258" cy="160" rx="7" ry="13" />
            <ellipse cx="176" cy="192" rx="13" ry="7" />
            <ellipse cx="96" cy="190" rx="13" ry="7" />
          </g>
          <g v-bind="hitProps('mitochondrion')" fill="#f59e0b" stroke="#7c2d12" stroke-width="2">
            <ellipse cx="226" cy="192" rx="13" ry="6.5" />
            <ellipse cx="66" cy="170" rx="6.5" ry="13" />
            <path
              d="M218 193 q2.5 -5 5 0 t5 0 t5 0"
              fill="none"
              stroke-width="1.5"
              pointer-events="none"
            />
            <path
              d="M67 162 q-5 2.5 0 5 t0 5 t0 5"
              fill="none"
              stroke-width="1.5"
              pointer-events="none"
            />
          </g>
        </template>

        <template v-else>
          <path v-bind="hitProps('cytoplasm')" :d="ANIMAL_OUTLINE" fill="#1c3a6b" />
          <clipPath :id="animalInsideId">
            <path :d="ANIMAL_OUTLINE" />
          </clipPath>
          <g v-bind="hitProps('membrane')">
            <!-- Outer half of this stroke is outside the cell (nothing else there), inner
                 half overlaps the cytoplasm edge; clipped inside like the plant cell. -->
            <path
              class="hit-area"
              :d="ANIMAL_OUTLINE"
              fill="none"
              stroke="transparent"
              stroke-width="14"
              pointer-events="stroke"
              :clip-path="`url(#${animalInsideId})`"
            />
            <path
              :d="ANIMAL_OUTLINE"
              fill="none"
              stroke="#2dd4bf"
              stroke-width="5"
              pointer-events="none"
            />
          </g>
          <g v-bind="hitProps('nucleus')">
            <circle cx="165" cy="120" r="36" fill="#3b1f6b" stroke="#c4b5fd" stroke-width="3" />
            <circle cx="158" cy="114" r="11" fill="#c4b5fd" opacity="0.8" />
          </g>
          <g v-bind="hitProps('mitochondrion')" fill="#f59e0b" stroke="#7c2d12" stroke-width="2">
            <ellipse cx="104" cy="94" rx="13" ry="6.5" transform="rotate(-20 104 94)" />
            <ellipse cx="226" cy="150" rx="13" ry="6.5" transform="rotate(15 226 150)" />
            <ellipse cx="122" cy="168" rx="13" ry="6.5" transform="rotate(25 122 168)" />
            <g fill="none" stroke-width="1.5" pointer-events="none">
              <path d="M96 95 q2.5 -5 5 0 t5 0 t5 0" transform="rotate(-20 104 94)" />
              <path d="M218 151 q2.5 -5 5 0 t5 0 t5 0" transform="rotate(15 226 150)" />
              <path d="M114 169 q2.5 -5 5 0 t5 0 t5 0" transform="rotate(25 122 168)" />
            </g>
          </g>
          <g v-bind="hitProps('vacuole')" fill="#93c5fd" opacity="0.7">
            <circle cx="226" cy="86" r="6" />
            <circle cx="200" cy="184" r="5" />
          </g>
        </template>
      </svg>

      <div class="space-y-4">
        <div data-testid="structure-info" aria-live="polite" class="min-h-32 space-y-2">
          <template v-if="selectedPoint">
            <h3>
              <span class="whitespace-nowrap">{{ selectedPoint.term.zh }}</span>
              <span class="ml-2 text-base font-normal text-muted">{{ selectedPoint.term.en }}</span>
            </h3>
            <p>{{ selectedPoint.definition }}</p>
            <p class="text-muted">{{ selectedPoint.plain }}</p>
          </template>
          <p v-else class="text-muted">點選細胞圖上的構造，或下方的按鈕，看看它負責什麼工作。</p>
        </div>

        <div class="flex flex-wrap gap-2" role="group" :aria-label="`${CELL_NAME[kind]}的構造`">
          <button
            v-for="id in STRUCTURES[kind]"
            :key="id"
            type="button"
            data-testid="structure-chip"
            :data-structure="id"
            :aria-pressed="selected === id"
            :class="[
              'min-h-11 rounded-pill border px-4 text-sm font-semibold transition-colors motion-reduce:transition-none',
              selected === id
                ? 'border-reward bg-reward/15 text-reward'
                : 'border-border text-text hover:border-explore',
            ]"
            @click="select(id)"
          >
            <span v-if="explored[kind].has(id)" aria-hidden="true">✓ </span
            >{{ pointFor(id)?.term.zh }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <p data-testid="explore-progress" class="text-sm text-muted">
        {{ CELL_NAME[kind] }}已探索 {{ explored[kind].size }} / {{ STRUCTURES[kind].length }}
      </p>
      <BaseButton data-testid="explore-reset" variant="ghost" @click="reset">↺ 重新探索</BaseButton>
    </div>

    <div class="space-y-3">
      <h3 class="text-lg">任務進度</h3>
      <ul class="space-y-1">
        <li v-for="item in missionItems" :key="item.key" data-testid="mission-item">
          <span v-if="item.done" class="text-success">✓ {{ item.label }}</span>
          <span v-else class="text-muted">○ {{ item.label }}</span>
        </li>
      </ul>
      <p
        v-if="remaining.length"
        :id="hintId"
        data-testid="explore-hint"
        aria-live="polite"
        class="text-sm text-muted"
      >
        還差：{{ remaining.map((i) => i.label).join('、') }}
      </p>
      <BaseButton
        data-testid="explore-done"
        variant="reward"
        :disabled="remaining.length > 0"
        :aria-describedby="remaining.length ? hintId : undefined"
        @click="finish"
      >
        任務完成，下一步：互動挑戰 →
      </BaseButton>
    </div>
  </BaseCard>
</template>

<style scoped>
/* White: distinct from every fill and from the (yellow) cell-wall border.
   Hit areas keep their transparent wide stroke, or selecting would shrink them. */
.is-selected,
.is-selected > :not(.hit-area) {
  stroke: #ffffff;
  stroke-width: 4px;
}
.is-selected-fill {
  fill: #2f5ea8;
}
</style>
