<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseTag from '@/components/common/BaseTag.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import CellIllustration from '@/components/common/CellIllustration.vue'
import courses from '@/data/courses.json'
import type { Course } from '@/types/course'
import { useProgressStore } from '@/stores/progress'

const router = useRouter()
const progress = useProgressStore()

const storyTitleById = new Map((courses as Course[]).map((c) => [c.id, c.storyTitle]))
const courseName = (id: string) => storyTitleById.get(id) ?? id

const dateFormat = new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' })

// 重設學習資料 (TASK-013): two steps, so one stray tap can't wipe a student's progress.
const confirming = ref(false)
const resetDone = ref(false)
const resetButton = ref<InstanceType<typeof BaseButton> | null>(null)
const cancelButton = ref<InstanceType<typeof BaseButton> | null>(null)
const focusOf = (b: InstanceType<typeof BaseButton> | null) =>
  (b?.$el as HTMLElement | undefined)?.focus()

function askReset() {
  resetDone.value = false
  confirming.value = true
  // Cancel is the safe default for a destructive action.
  nextTick(() => focusOf(cancelButton.value))
}
function cancelReset() {
  confirming.value = false
  nextTick(() => focusOf(resetButton.value))
}
function confirmReset() {
  progress.resetAll()
  confirming.value = false
  resetDone.value = true
  nextTick(() => focusOf(resetButton.value))
}
</script>

<template>
  <main class="page-container space-y-8 py-8 sm:py-12">
    <section class="grid items-center gap-6 md:grid-cols-2">
      <div class="space-y-4 text-center md:text-left">
        <h1 class="text-5xl tracking-wide lg:text-6xl">
          <span class="text-explore">BIO</span> <span class="text-reward">QUEST</span>
        </h1>
        <p class="text-xl font-semibold">生物冒險</p>
        <p class="text-muted">縮小身體、潛入細胞，完成任務來解開生命的祕密！</p>
        <BaseButton
          data-testid="start-adventure"
          size="lg"
          class="w-full sm:w-auto"
          @click="router.push('/map')"
        >
          開始冒險 →
        </BaseButton>
      </div>
      <CellIllustration class="mx-auto w-full max-w-xs md:max-w-sm" />
    </section>

    <div class="grid gap-4 md:grid-cols-2">
      <BaseCard as="section" highlight="reward" aria-labelledby="player-heading">
        <h2 id="player-heading" class="mb-3 text-xl">我的探險等級</h2>
        <p data-testid="player-level" class="mb-1 text-3xl font-bold text-reward">
          Lv.{{ progress.levelInfo.level }} {{ progress.levelInfo.title }}
        </p>
        <div data-testid="player-exp" class="space-y-2">
          <p class="text-2xl font-bold">{{ progress.levelInfo.exp }} EXP</p>
          <template v-if="progress.levelInfo.nextLevelMinExp !== null">
            <ProgressBar
              :value="progress.levelInfo.exp - progress.levelInfo.levelMinExp"
              :max="progress.levelInfo.nextLevelMinExp - progress.levelInfo.levelMinExp"
              :label="`升到 Lv.${progress.levelInfo.level + 1} 的進度`"
              tone="reward"
            />
            <p class="text-sm text-muted">
              距離 Lv.{{ progress.levelInfo.level + 1 }} 還差 {{ progress.levelInfo.expToNext }} EXP
            </p>
          </template>
          <p v-else class="text-sm font-semibold text-reward">★ 已達最高等級！</p>
        </div>
      </BaseCard>

      <BaseCard as="section" aria-labelledby="recent-heading">
        <h2 id="recent-heading" class="mb-3 text-xl">最近學習紀錄</h2>
        <p v-if="progress.latestRecords.length === 0" data-testid="recent-empty" class="text-muted">
          還沒有學習紀錄。按下「開始冒險」挑戰第一關吧！
        </p>
        <ul v-else class="space-y-3">
          <li
            v-for="record in progress.latestRecords"
            :key="`${record.courseId}-${record.completedAt}-${record.score}`"
            data-testid="recent-record"
            class="flex flex-wrap items-center justify-between gap-2"
          >
            <span class="min-w-0">
              <span class="font-semibold">{{ courseName(record.courseId) }}</span>
              <span class="ml-2 text-sm text-muted">
                {{ dateFormat.format(new Date(record.completedAt)) }}
              </span>
            </span>
            <span class="flex items-center gap-2">
              <span class="font-bold">{{ record.score }} 分</span>
              <BaseTag :tone="record.passed ? 'success' : 'danger'">
                {{ record.passed ? '✓ 通過' : '✗ 未通過' }}
              </BaseTag>
            </span>
          </li>
        </ul>
        <RouterLink
          to="/review"
          data-testid="home-review-link"
          class="mt-4 inline-flex min-h-11 items-center font-semibold text-explore hover:underline"
          ><span aria-hidden="true">📖 </span>錯題本（{{
            progress.toReviewCount
          }}
          題待複習）→</RouterLink
        >
      </BaseCard>
    </div>

    <BaseCard as="section" class="space-y-3" aria-labelledby="data-heading">
      <h2 id="data-heading" class="text-xl">學習資料</h2>
      <p class="text-sm text-muted">學習紀錄只保存在這台裝置的瀏覽器中。</p>
      <div
        v-if="confirming"
        data-testid="reset-confirm"
        role="group"
        aria-labelledby="reset-confirm-title"
        aria-describedby="reset-confirm-detail"
        @keydown.esc="cancelReset"
        class="space-y-3 rounded-control border-l-4 border-danger bg-danger/15 px-4 py-3"
      >
        <p id="reset-confirm-title" class="font-bold text-danger-text">⚠ 確定要重設學習資料嗎？</p>
        <p id="reset-confirm-detail">
          經驗值、等級、各關成績與通關狀態、學習紀錄和錯題都會被清除，而且無法復原。
        </p>
        <div class="flex flex-wrap gap-3">
          <BaseButton
            ref="cancelButton"
            data-testid="reset-cancel"
            variant="secondary"
            @click="cancelReset"
          >
            取消
          </BaseButton>
          <button
            type="button"
            data-testid="reset-yes"
            class="inline-flex min-h-11 items-center justify-center rounded-control border-2 border-danger px-5 font-bold text-danger-text hover:bg-danger/15"
            @click="confirmReset"
          >
            確定重設
          </button>
        </div>
      </div>
      <BaseButton
        v-else
        ref="resetButton"
        data-testid="reset-data"
        variant="ghost"
        @click="askReset"
      >
        重設學習資料
      </BaseButton>
      <p data-testid="reset-status" aria-live="polite" class="text-sm font-semibold text-success">
        <template v-if="resetDone">✓ 學習資料已重設。</template>
      </p>
    </BaseCard>
  </main>
</template>
