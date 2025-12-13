<template>
  <div data-testid="memo-list">
    <div
      v-if="items.length === 0"
      class="text-center py-8 text-base-content/60"
    >
      {{ emptyMessage }}
    </div>
    <div
      v-else
      class="columns-1 md:columns-2 xl:columns-3 gap-4"
    >
      <div
        v-for="item in items"
        :key="item.id"
        class="break-inside-avoid mb-4"
      >
        <MemoCard :memo="item" />
      </div>
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
