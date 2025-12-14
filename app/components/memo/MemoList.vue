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
      <TransitionGroup
        :name="animateItems ? 'memo-card' : ''"
        tag="div"
        class="contents"
      >
        <div
          v-for="item in items"
          :key="item.id"
          class="break-inside-avoid mb-4"
        >
          <MemoCard :memo="item" />
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MemoListItem } from '~~/shared/types/memo'

interface Props {
  items: MemoListItem[]
  emptyMessage: string
  animateItems?: boolean
}

defineProps<Props>()
</script>

<style scoped>
.memo-card-leave-active {
  transition: all 0.4s ease-out;
}

.memo-card-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
