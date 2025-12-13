<template>
  <div
    class="space-y-3"
    data-testid="memo-list"
  >
    <MemoCard
      v-for="item in items"
      :key="item.id"
      :memo="item"
    />
    <div
      v-if="items.length === 0"
      class="text-center py-8 text-base-content/60"
    >
      {{ emptyMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MemoListItem } from '~~/shared/types/memo'

interface Props {
  items: MemoListItem[]
  emptyMessage: string
}

defineProps<Props>()
</script>
