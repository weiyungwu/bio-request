<script setup lang="ts">
import { useRouter } from 'vue-router'
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
      </BaseCard>
    </div>
  </main>
</template>
