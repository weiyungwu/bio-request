<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import ClassificationGame from '@/components/game/ClassificationGame.vue'
import MatchingGame from '@/components/game/MatchingGame.vue'
import CellExplorer from '@/components/lesson/CellExplorer.vue'
import LessonCard from '@/components/lesson/LessonCard.vue'
import StoryDialog from '@/components/lesson/StoryDialog.vue'
import courses from '@/data/courses.json'
import { useProgressStore } from '@/stores/progress'
import { GAME_EXP, UNIT_EXP } from '@/utils/exp'
import { getLessonData } from '@/data/lessons'
import type { Course } from '@/types/course'

const route = useRoute()
const courseId = computed(() => String(route.params.courseId))
const course = computed(() => (courses as Course[]).find((c) => c.id === courseId.value))
const lesson = computed(() => getLessonData(courseId.value))
const points = computed(() => lesson.value?.lessons.flatMap((l) => l.knowledgePoints) ?? [])

// [choose ->] story -> lesson -> explore (cell diagram) -> game (matching TASK-008 -> classification
// TASK-009). A lesson in parts (上篇／下篇) first asks where to start; a later part skips the story.
type Phase = 'choose' | 'story' | 'lesson' | 'explore' | 'game'
const firstPhase = (): Phase => (lesson.value?.parts?.length ? 'choose' : 'story')
const phase = ref<Phase>(firstPhase())
const startPart = ref(0)
const unitLetter = (lessonId: string) =>
  String.fromCharCode(65 + (lesson.value?.lessons.findIndex((l) => l.id === lessonId) ?? 0))
const pointCount = (lessonIds: string[]) =>
  lesson.value?.lessons
    .filter((l) => lessonIds.includes(l.id))
    .reduce((n, l) => n + l.knowledgePoints.length, 0) ?? 0
const game = ref<'matching' | 'classification'>('matching')
const lessonHeading = ref<HTMLElement | null>(null)
const exploreHeading = ref<HTMLElement | null>(null)
const gameHeading = ref<HTMLElement | null>(null)

// The view is reused when only :courseId changes; restart the flow.
watch(courseId, () => {
  phase.value = firstPhase()
  startPart.value = 0
  game.value = 'matching'
  reward.value = ''
})

function choosePart(part: number) {
  startPart.value = part
  if (part === 0) phase.value = 'story'
  else enterLesson()
}
function enterLesson() {
  phase.value = 'lesson'
  nextTick(() => lessonHeading.value?.focus())
}

function enterExplore() {
  phase.value = 'explore'
  nextTick(() => exploreHeading.value?.focus())
}

function enterGame() {
  phase.value = 'game'
  nextTick(() => gameHeading.value?.focus())
}

// ClassificationGame focuses its own title when it mounts.
function enterClassification() {
  game.value = 'classification'
}

// First-time rewards (docs/progression.md §2, TASK-015): +10 per unit, +15 per game; claim()
// pays once, so re-reading or replaying shows nothing.
const progress = useProgressStore()
const reward = ref('')
function notify(paid: number, what: string) {
  if (paid > 0) reward.value = `🎉 ${what}：+${paid} EXP`
}
function rewardUnit(lessonId: string) {
  const title = lesson.value?.lessons.find((l) => l.id === lessonId)?.title ?? lessonId
  notify(progress.claim(`unit:${courseId.value}:${lessonId}`, UNIT_EXP), `完成單元「${title}」`)
}
function rewardGame(id: string, name: string) {
  notify(progress.claim(`game:${courseId.value}:${id}`, GAME_EXP), `完成小遊戲「${name}」`)
}
</script>

<template>
  <main class="page-container space-y-4 py-8">
    <RouterLink
      to="/map"
      class="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-text"
      >← 回關卡地圖</RouterLink
    >
    <h1>{{ course?.storyTitle }}</h1>
    <p
      data-testid="reward-notice"
      aria-live="polite"
      class="text-sm font-semibold text-reward empty:hidden"
    >
      {{ reward }}
    </p>

    <section
      v-if="phase === 'choose' && lesson?.parts"
      data-testid="part-choice"
      aria-labelledby="choose-heading"
      class="space-y-4"
    >
      <h2 id="choose-heading">選擇從哪裡開始</h2>
      <p class="text-muted">這一關分成 {{ lesson.parts.length }} 篇，可以分次讀完。</p>
      <BaseCard
        v-for="(part, i) in lesson.parts"
        :key="part.name"
        as="section"
        class="space-y-3"
        :aria-label="part.name"
      >
        <h3>{{ part.name }}：{{ part.title }}</h3>
        <p class="text-sm text-muted">
          單元 {{ part.lessonIds.map(unitLetter).join('、') }}・{{ pointCount(part.lessonIds) }}
          個知識點
        </p>
        <BaseButton
          :data-testid="`part-start-${i}`"
          :variant="i === 0 ? 'primary' : 'ghost'"
          @click="choosePart(i)"
        >
          {{ i === 0 ? `從${part.name}開始（含故事）` : `直接看${part.name}` }} →
        </BaseButton>
      </BaseCard>
    </section>
    <StoryDialog
      v-else-if="phase === 'story' && lesson"
      :key="courseId"
      :story="lesson.story"
      @complete="enterLesson"
    />
    <section
      v-else-if="phase === 'lesson' || !lesson"
      data-testid="lesson-content"
      aria-labelledby="lesson-heading"
      class="space-y-4"
    >
      <h2 id="lesson-heading" ref="lessonHeading" tabindex="-1">探險者訓練</h2>
      <LessonCard
        v-if="lesson"
        :key="courseId"
        :lessons="lesson.lessons"
        :parts="lesson.parts"
        :start-part="startPart"
        @complete="enterExplore"
        @unit-complete="rewardUnit"
      />
    </section>
    <section
      v-else-if="phase === 'explore'"
      data-testid="explore-content"
      aria-labelledby="explore-heading"
      class="space-y-4"
    >
      <h2 id="explore-heading" ref="exploreHeading" tabindex="-1">細胞城市探險</h2>
      <CellExplorer
        :key="courseId"
        :points="points"
        :targets="lesson.explorer.targets"
        @complete="enterGame"
      />
    </section>
    <section v-else data-testid="game-content" aria-labelledby="game-heading" class="space-y-4">
      <h2 id="game-heading" ref="gameHeading" tabindex="-1">互動挑戰</h2>
      <MatchingGame
        v-if="game === 'matching'"
        :key="courseId"
        :pairs="lesson.matching.pairs"
        :points="points"
        @finished="rewardGame('matching', '細胞器配對')"
        @complete="enterClassification"
      />
      <ClassificationGame
        v-else
        :key="courseId"
        :items="lesson.classification.items"
        :points="points"
        @complete="rewardGame('classification', '植物還是動物？')"
      >
        <!-- The games lead into the stage quiz (TASK-011). -->
        <template #next>
          <RouterLink
            :to="`/quiz/${courseId}`"
            data-testid="classification-to-quiz"
            class="inline-flex min-h-11 items-center justify-center rounded-control bg-explore px-5 font-bold text-on-accent hover:bg-explore-strong"
            >進入關卡測驗 →</RouterLink
          >
        </template>
      </ClassificationGame>
    </section>
  </main>
</template>
