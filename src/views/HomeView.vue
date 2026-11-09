<script setup lang="ts">
import { computed } from 'vue'
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

const courseTitle = computed(() => {
  const byId = new Map((courses as Course[]).map((c) => [c.id, c.title]))
  return (id: string) => byId.get(id) ?? id
})

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
        <p data-testid="player-level" class="mb-3 text-3xl font-bold text-reward">
          Lv {{ progress.levelInfo.level }}
        </p>
        <div data-testid="player-exp">
          <ProgressBar
            :value="progress.levelInfo.expIntoLevel"
            :max="progress.levelInfo.expForNextLevel"
            label="距離下一級的經驗值"
            unit="EXP"
            tone="reward"
          />
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
            :key="record.completedAt"
            data-testid="recent-record"
            class="flex flex-wrap items-center justify-between gap-2"
          >
            <span class="min-w-0">
              <span class="font-semibold">{{ courseTitle(record.courseId) }}</span>
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
