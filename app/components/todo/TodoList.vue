<template>
  <div data-testid="todo-list">
    <div class="columns-1 md:columns-2 xl:columns-3 gap-4">
      <TransitionGroup
        :name="animateItems ? 'fade-up' : ''"
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
    <Transition name="fade-delayed">
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
