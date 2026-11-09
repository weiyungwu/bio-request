<script setup lang="ts">
import type { KnowledgePoint } from '@/types/lesson'
import ImageExplanation from './ImageExplanation.vue'
import ImportantNote from './ImportantNote.vue'

defineProps<{ point: KnowledgePoint }>()
</script>

<template>
  <article class="space-y-4">
    <h3 class="flex flex-wrap items-baseline gap-x-2">
      <span v-if="point.icon && !point.image" aria-hidden="true">{{ point.icon }}</span>
      <span data-testid="term-zh" class="whitespace-nowrap">{{ point.term.zh }}</span>
      <span class="text-base font-normal text-muted">{{ point.term.en }}</span>
    </h3>

    <dl class="space-y-3">
      <div>
        <dt class="text-sm font-semibold text-explore">正式定義</dt>
        <dd>{{ point.definition }}</dd>
      </div>
      <div>
        <dt class="text-sm font-semibold text-explore">白話解釋</dt>
        <dd>{{ point.plain }}</dd>
      </div>
    </dl>

    <ImageExplanation v-if="point.image" :image="point.image" />

    <div>
      <p class="text-sm font-semibold text-bio">生活例子</p>
      <p>{{ point.example }}</p>
    </div>

    <ImportantNote>{{ point.examTip }}</ImportantNote>
  </article>
</template>
