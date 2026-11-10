<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseTag from '@/components/common/BaseTag.vue'
import courses from '@/data/courses.json'
import { getLessonData } from '@/data/lessons'
import { getQuestionBank } from '@/data/questions'
import type { Course } from '@/types/course'
import type { MasteryLevel } from '@/types/mastery'
import { courseReport } from '@/utils/knowledgeReport'
import { parseEventStore, readEventStorage } from '@/utils/learningEventStorage'
import { readPlayerId } from '@/utils/learningEvents'
import { isCourseOpen } from '@/utils/stages'

// Text and icon, not colour alone (README: 狀態不可只靠顏色表示).
const LEVEL: Record<
  MasteryLevel,
  { label: string; tone: 'neutral' | 'explore' | 'reward' | 'success' }
> = {
  not_started: { label: '○ 未開始', tone: 'neutral' },
  learning: { label: '📖 學習中', tone: 'explore' },
  practicing: { label: '✏️ 練習中', tone: 'reward' },
  mastered: { label: '⭐ 已精熟', tone: 'success' },
}
const percent = (accuracy: number) => `${Math.round(accuracy * 100)}%`

// Read once per visit: answers are only added on other pages.
const events = parseEventStore(readEventStorage()).events
// No id yet means no answers yet; looking must not create one.
const options = { playerId: readPlayerId() ?? '', now: new Date() }
const reports = [...(courses as Course[])]
  .sort((a, b) => a.order - b.order)
  .filter((c) => isCourseOpen(c.id))
  .flatMap((course) => {
    const lesson = getLessonData(course.id)
    const bank = getQuestionBank(course.id)
    return lesson && bank
      ? [{ course, ...courseReport(lesson, bank.questions, events, options) }]
      : []
  })
const answeredAny = reports.some((r) =>
  r.units.some((u) => u.points.some((p) => p.mastery.totalAttempts > 0)),
)

const heading = ref<HTMLElement | null>(null)
onMounted(() => heading.value?.focus())
</script>

<template>
  <main class="page-container space-y-4 py-8">
    <RouterLink
      to="/"
      class="inline-flex min-h-11 items-center text-sm font-semibold text-muted hover:text-text"
      >← 回首頁</RouterLink
    >
    <h1 ref="heading" tabindex="-1">知識掌握度</h1>
    <!-- v1.1 §4.1: mastery is not game progress; say so. -->
    <p class="text-muted">
      依你在測驗與錯題本的作答紀錄計算，和關卡是否完成無關。要達到「已精熟」，需要在不同的日子、答對不同的題目。
    </p>
    <p v-if="!answeredAny" data-testid="mastery-empty" class="text-muted">
      還沒有作答紀錄。完成關卡測驗後，這裡會顯示每個知識點的掌握程度。
    </p>

    <template v-for="r in reports" :key="r.course.id">
      <BaseCard
        v-if="r.weakest.length"
        as="section"
        data-testid="mastery-weak"
        highlight="reward"
        class="space-y-3"
        :aria-labelledby="`weak-${r.course.id}`"
      >
        <h2 :id="`weak-${r.course.id}`" class="text-xl">第 {{ r.course.order }} 關 需要加強</h2>
        <ol class="space-y-1">
          <li v-for="p in r.weakest" :key="p.id">
            <span class="font-semibold">{{ p.term }}</span>
            <span class="text-muted">：最近答對 {{ percent(p.mastery.recentAccuracy) }}</span>
          </li>
        </ol>
        <RouterLink
          to="/review"
          class="inline-flex min-h-11 items-center font-semibold text-explore hover:underline"
          ><span aria-hidden="true">📖 </span>到錯題本重新作答 →</RouterLink
        >
      </BaseCard>

      <BaseCard as="section" class="space-y-4" :aria-labelledby="`mastery-${r.course.id}`">
        <h2 :id="`mastery-${r.course.id}`" class="text-xl">
          第 {{ r.course.order }} 關 {{ r.course.storyTitle }}
        </h2>
        <section v-for="u in r.units" :key="u.id" class="space-y-2">
          <h3 class="text-base">{{ u.title }}</h3>
          <ul class="divide-y divide-border">
            <li
              v-for="p in u.points"
              :key="p.id"
              data-testid="mastery-point"
              :data-id="p.id"
              class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2"
            >
              <span class="font-semibold">{{ p.term }}</span>
              <span class="flex flex-wrap items-center gap-2 text-sm">
                <span v-if="p.mastery.totalAttempts" class="text-muted">
                  答對 {{ p.mastery.correctAttempts }} / {{ p.mastery.totalAttempts }} 次（{{
                    percent(p.mastery.accuracy)
                  }}）
                </span>
                <BaseTag :tone="LEVEL[p.mastery.masteryLevel].tone">
                  {{ LEVEL[p.mastery.masteryLevel].label }}
                </BaseTag>
              </span>
              <p
                v-if="!p.enoughQuestions"
                data-testid="mastery-few"
                class="w-full text-xs text-muted"
              >
                <template v-if="p.questionCount === 0">這個知識點還沒有題目。</template>
                <template v-else
                  >題目還在增加中（目前 {{ p.questionCount }} 題），暫時最多到「練習中」。</template
                >
              </p>
            </li>
          </ul>
        </section>
      </BaseCard>
    </template>
  </main>
</template>
