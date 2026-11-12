<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseTag from '@/components/common/BaseTag.vue'
import KnowledgeCard from '@/components/lesson/KnowledgeCard.vue'
import QuizPlayer from '@/components/quiz/QuizPlayer.vue'
import courses from '@/data/courses.json'
import { getLessonData } from '@/data/lessons'
import { getQuestionBank } from '@/data/questions'
import { useProgressStore } from '@/stores/progress'
import { useQuizStore } from '@/stores/quiz'
import type { Course } from '@/types/course'
import type { KnowledgePoint } from '@/types/lesson'
import type { Question } from '@/types/question'
import type { MasteryLevel } from '@/types/mastery'
import { DAILY_QUIZ_EXP_CAP } from '@/utils/exp'
import { courseReport, needsLesson, pointReason } from '@/utils/knowledgeReport'
import { parseEventStore, readEventStorage } from '@/utils/learningEventStorage'
import { readPlayerId } from '@/utils/learningEvents'
import { MASTERY_LEVEL, percent } from '@/utils/masteryLevels'
import { drawPractice, practiceTargets } from '@/utils/practice'

/** 弱點練習 (v1.1 Phase 2): 5 questions on the points the student is weakest at. */
const route = useRoute()
const quiz = useQuizStore()
const progress = useProgressStore()
const courseId = computed(() => String(route.params.courseId))
const course = computed(() => (courses as Course[]).find((c) => c.id === courseId.value))
/** `?k=<knowledge id>`: a point the student chose on 知識掌握度 (§20 5.5). */
const chosen = computed(() => (typeof route.query.k === 'string' ? route.query.k : undefined))
// Whether the chosen point was found; set per start.
const ownPick = ref(false)

interface Target {
  id: string
  term: string
  before: MasteryLevel
  /** Why it was picked (§20 5.4), as it stood before this practice. */
  reason: string
  /** Its lesson card, when it should be read before practising (§20 5.2). */
  card?: KnowledgePoint
}

/** The course's mastery report from the answers saved so far (read fresh each time). */
function report() {
  const lesson = getLessonData(courseId.value)
  const bank = getQuestionBank(courseId.value)
  if (!lesson || !bank) return null
  const events = parseEventStore(readEventStorage()).events
  // No id yet means no answers yet; looking must not create one.
  const options = { playerId: readPlayerId() ?? '', now: new Date() }
  return {
    bank,
    events,
    options,
    cards: lesson.lessons.flatMap((l) => l.knowledgePoints),
    ...courseReport(lesson, bank.questions, events, options),
  }
}

const targets = ref<Target[]>([])
// Bumped per start; QuizPlayer remounts the question on it.
const round = ref(0)
const empty = ref(false)
// §20 5.2: points answered badly get their lesson card first. Shown before the questions,
// not beside them, so the practice still measures what the student remembers.
const reading = ref(false)
// The drawn questions wait while the student reads: the practice (and its quiz_started event)
// begins on 開始練習, so leaving mid-read logs nothing.
let pending: Question[] = []
const lessonHeading = ref<HTMLElement | null>(null)

function start() {
  const r = report()
  const points = r ? practiceTargets(r, chosen.value) : []
  ownPick.value =
    chosen.value !== undefined && points.length === 1 && points[0]!.id === chosen.value
  const drawn = r ? drawPractice(points, r.bank.questions, r.events, r.options.playerId) : []
  empty.value = drawn.length === 0
  targets.value = points.map((p) => ({
    id: p.id,
    term: p.term,
    before: p.mastery.masteryLevel,
    reason: pointReason(p.mastery),
    card: needsLesson(p.mastery) ? r?.cards.find((k) => k.id === p.id) : undefined,
  }))
  reading.value = !empty.value && targets.value.some((t) => t.card)
  if (empty.value || reading.value) {
    pending = drawn
    quiz.reset()
    // 再練一次 is gone with the result; keep focus in the page (Phase C review I2).
    if (reading.value) void nextTick(() => lessonHeading.value?.focus())
    return
  }
  begin(drawn)
}
function begin(drawn: Question[]) {
  quiz.startPractice(courseId.value, drawn)
  round.value++
}
watch([courseId, chosen], start, { immediate: true })

const done = computed(
  () => quiz.finished && quiz.kind === 'practice' && quiz.courseId === courseId.value,
)
// Each practised point before and after, worked out again once the answers are saved
// (they are logged on submit, before the result shows).
const rows = computed(() => {
  if (!done.value) return []
  const points = new Map((report()?.units.flatMap((u) => u.points) ?? []).map((p) => [p.id, p]))
  return targets.value.map((t) => {
    const now = points.get(t.id)?.mastery
    return { ...t, after: now?.masteryLevel ?? t.before, recent: now?.recentAccuracy }
  })
})
const wrongCount = computed(() => quiz.results.filter((r) => !r.correct).length)

const cards = computed(() => targets.value.flatMap((t) => (t.card ? [t.card] : [])))
// QuizPlayer mounts the first question, which takes focus.
function startQuestions() {
  reading.value = false
  begin(pending)
}

const resultHeading = ref<HTMLElement | null>(null)
function next() {
  if (quiz.finished) return
  quiz.next()
  if (quiz.finished) void nextTick(() => resultHeading.value?.focus())
}

const link =
  'inline-flex min-h-11 items-center justify-center rounded-control border-2 border-explore px-5 font-bold text-explore hover:bg-explore/10'
</script>

<template>
  <main class="page-container space-y-4 py-8">
    <RouterLink
      to="/mastery"
      class="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-text"
      >← 回知識掌握度</RouterLink
    >
    <h1>{{ course?.storyTitle }}：弱點練習</h1>

    <BaseCard v-if="empty" as="section" data-testid="practice-empty" class="space-y-3">
      <p>這一關目前沒有可以練習的題目。</p>
    </BaseCard>

    <template v-else-if="!done">
      <div id="practice-targets" data-testid="practice-targets" class="text-muted">
        <p v-if="ownPick">這次練習你選的知識點：</p>
        <p v-else>這次練習的知識點和原因：</p>
        <ul class="list-disc pl-6">
          <li v-for="t in targets" :key="t.id" data-testid="practice-reason">
            <span class="font-semibold text-text">{{ t.term }}</span
            >：{{ t.reason }}
          </li>
        </ul>
      </div>
      <section
        v-if="reading"
        data-testid="practice-lesson"
        class="space-y-4"
        aria-labelledby="practice-lesson-title"
      >
        <h2 id="practice-lesson-title" ref="lessonHeading" tabindex="-1" class="text-lg">
          開始練習前，先看一下教材
        </h2>
        <BaseCard v-for="c in cards" :key="c.id" data-testid="practice-card">
          <KnowledgeCard :point="c" />
        </BaseCard>
        <BaseButton data-testid="practice-start" @click="startQuestions"
          >看完了，開始練習</BaseButton
        >
      </section>
      <QuizPlayer v-else :round="round" described-by="practice-targets" @next="next" />
    </template>

    <template v-else-if="quiz.award">
      <BaseCard as="section" class="space-y-2" aria-labelledby="practice-result-title">
        <h2
          id="practice-result-title"
          ref="resultHeading"
          tabindex="-1"
          aria-describedby="practice-score"
          class="text-lg"
        >
          練習完成
        </h2>
        <p id="practice-score" data-testid="practice-score" class="text-3xl font-bold">
          {{ quiz.score }} 分
        </p>
        <p>
          答對 {{ quiz.correctCount }} 題 · 答錯 {{ wrongCount }} 題（共
          {{ quiz.questions.length }} 題）
        </p>
        <p data-testid="practice-exp">
          獲得 EXP <span class="font-bold text-reward">+{{ quiz.award.total }}</span>
          <span v-if="quiz.award.total === 0 && !quiz.award.capped" class="text-sm text-muted">
            （60 分以上才能獲得 EXP）</span
          >
        </p>
        <p v-if="quiz.award.capped" data-testid="practice-capped" class="text-sm text-muted">
          今天的測驗 EXP 已達上限（每天 {{ DAILY_QUIZ_EXP_CAP }} EXP，和關卡測驗共用）。
        </p>
        <p class="text-sm text-muted">
          目前 Lv.{{ progress.levelInfo.level }} {{ progress.levelInfo.title }} ·
          {{ progress.levelInfo.exp }} EXP
        </p>
      </BaseCard>

      <BaseCard as="section" class="space-y-3" aria-labelledby="practice-change-title">
        <h2 id="practice-change-title" class="text-lg">知識點的變化</h2>
        <ul class="divide-y divide-border">
          <li
            v-for="t in rows"
            :key="t.id"
            data-testid="practice-point"
            :data-id="t.id"
            class="flex flex-wrap items-center gap-2 py-2"
          >
            <span class="font-semibold">{{ t.term }}</span>
            <BaseTag :tone="MASTERY_LEVEL[t.before].tone">{{
              MASTERY_LEVEL[t.before].label
            }}</BaseTag>
            <span aria-hidden="true">→</span>
            <span class="sr-only">變成</span>
            <BaseTag data-testid="practice-after" :tone="MASTERY_LEVEL[t.after].tone">
              {{ MASTERY_LEVEL[t.after].label }}
            </BaseTag>
            <span v-if="t.recent !== undefined" class="text-sm text-muted">
              最近答對 {{ percent(t.recent) }}
            </span>
          </li>
        </ul>
        <p class="text-sm text-muted">要達到「已精熟」，需要在不同的日子、答對不同的題目。</p>
      </BaseCard>

      <div class="flex flex-wrap gap-3">
        <BaseButton data-testid="practice-again" @click="start">↺ 再練一次</BaseButton>
        <!-- Shown after a perfect practice too while older mistakes wait (Phase v1.1-2 S-03). -->
        <RouterLink
          v-if="progress.toReviewCount > 0"
          to="/review"
          data-testid="practice-to-review"
          :class="link"
          >到錯題本複習（{{ progress.toReviewCount }} 題待複習）→</RouterLink
        >
        <RouterLink to="/mastery" :class="link">回知識掌握度</RouterLink>
      </div>
    </template>
  </main>
</template>
