<script setup lang="ts">
// Dev-only style guide for TASK-002 review. Not routed in production builds.
import BaseButton from '@/components/common/BaseButton.vue'
import BaseCard from '@/components/common/BaseCard.vue'
import BaseTag from '@/components/common/BaseTag.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'

const swatches = [
  ['bg', 'bg-bg'],
  ['surface', 'bg-surface'],
  ['surface-2', 'bg-surface-2'],
  ['explore', 'bg-explore'],
  ['reward', 'bg-reward'],
  ['success', 'bg-success'],
  ['danger', 'bg-danger'],
  ['muted', 'bg-muted'],
] as const
</script>

<template>
  <main class="page-container space-y-10 py-8">
    <header class="space-y-2">
      <h1>Design System</h1>
      <p class="text-muted">BIO QUEST UI tokens 與共用元件（僅開發模式）</p>
    </header>

    <section class="space-y-4">
      <h2>色彩</h2>
      <ul class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <li v-for="[name, cls] in swatches" :key="name" class="space-y-1">
          <div :class="[cls, 'h-14 rounded-control border border-border']" />
          <code class="text-sm text-muted">{{ name }}</code>
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2>字體層級</h2>
      <h1>H1 細胞探險隊</h1>
      <h2>H2 生命的特徵</h2>
      <h3>H3 細胞膜（Cell membrane）</h3>
      <h4>H4 小提示</h4>
      <p>
        內文：細胞是生物體構造和功能的基本單位。正式名詞與白話解釋會同時顯示，行高 1.7
        方便閱讀中文。
      </p>
      <p class="text-muted">次要文字（muted）</p>
    </section>

    <section class="space-y-4">
      <h2>按鈕</h2>
      <div class="flex flex-wrap gap-3">
        <BaseButton>主要按鈕</BaseButton>
        <BaseButton variant="secondary">次要按鈕</BaseButton>
        <BaseButton variant="reward">領取獎勵</BaseButton>
        <BaseButton variant="ghost">略過</BaseButton>
        <BaseButton disabled>未作答不可提交</BaseButton>
      </div>
      <BaseButton size="lg" block>開始冒險</BaseButton>
    </section>

    <section class="space-y-4">
      <h2>標籤</h2>
      <div class="flex flex-wrap gap-2">
        <BaseTag>未開放</BaseTag>
        <BaseTag tone="explore">探索中</BaseTag>
        <BaseTag tone="reward">+50 EXP</BaseTag>
        <BaseTag tone="success">已通關</BaseTag>
        <BaseTag tone="danger">答錯</BaseTag>
      </div>
    </section>

    <section class="space-y-4">
      <h2>進度條</h2>
      <ProgressBar :value="65" label="第一關進度" />
      <ProgressBar :value="120" :max="200" label="經驗值" tone="reward" />
    </section>

    <section class="space-y-4">
      <h2>卡片</h2>
      <div class="grid gap-4 md:grid-cols-3">
        <BaseCard as="article">
          <h3>一般卡片</h3>
          <p class="text-muted">知識點、紀錄等內容。</p>
        </BaseCard>
        <BaseCard as="article" highlight="explore">
          <h3>任務卡片</h3>
          <p class="text-muted">目前進行中的關卡。</p>
        </BaseCard>
        <BaseCard as="article" highlight="reward">
          <h3>獎勵卡片</h3>
          <p class="text-muted">徽章、成就。</p>
        </BaseCard>
      </div>
    </section>
  </main>
</template>
