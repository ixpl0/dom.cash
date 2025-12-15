<template>
  <div data-testid="todo-list">
    <div class="columns-1 md:columns-2 xl:columns-3 gap-4">
      <TransitionGroup
        :name="animateItems ? 'todo-card' : ''"
        tag="div"
        class="contents"
      >
        <div
          v-for="item in items"
          :key="item.id"
          class="break-inside-avoid mb-4"
        >
          <TodoCard :todo="item" />
        </div>
      </TransitionGroup>
    </div>
    <Transition name="empty-fade">
      <div
        v-if="items.length === 0"
        class="text-center py-8 text-base-content/60"
      >
        {{ emptyMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { TodoListItem } from '~~/shared/types/todo'

interface Props {
  items: TodoListItem[]
  emptyMessage: string
  animateItems?: boolean
}

defineProps<Props>()
</script>

<style scoped>
.todo-card-leave-active {
  transition: all 0.4s ease-out;
}

.todo-card-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.empty-fade-enter-active {
  transition: opacity 0.3s ease-out 0.4s;
}

.empty-fade-leave-active {
  transition: opacity 0.2s ease-out;
}

.empty-fade-enter-from,
.empty-fade-leave-to {
  opacity: 0;
}
</style>
