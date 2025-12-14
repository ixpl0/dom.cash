<template>
  <div data-testid="todo-page">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <h1 class="text-2xl font-bold animate-header-left">
        {{ t('todo.title') }}
      </h1>

      <div class="flex items-center gap-4 animate-header-right">
        <label class="label cursor-pointer gap-2">
          <span class="label-text text-sm">
            {{ t('todo.hideCompleted') }}
          </span>
          <input
            type="checkbox"
            class="toggle toggle-sm"
            :checked="todoStore.hideCompleted"
            data-testid="todo-hide-completed-toggle"
            @change="todoStore.toggleHideCompleted()"
          >
        </label>

        <button
          class="btn btn-primary"
          data-testid="todo-add-button"
          @click="todoModalsStore.openTodoModal()"
        >
          <Icon
            name="heroicons:plus"
            size="20"
          />
          {{ t('todo.addNew') }}
        </button>
      </div>
    </div>

    <div
      v-if="todoStore.isLoading"
      class="flex justify-center py-8"
    >
      <span class="loading loading-spinner loading-lg" />
    </div>

    <div
      v-else-if="todoStore.error"
      class="alert alert-error"
    >
      {{ todoStore.error }}
    </div>

    <div
      v-else
      class="animate-content"
    >
      <TodoList
        :items="todoStore.sortedItems"
        :empty-message="emptyMessage"
        :animate-items="todoStore.hideCompleted"
      />
    </div>

    <TodoModal />
  </div>
</template>

<script setup lang="ts">
const todoStore = useTodoStore()
const todoModalsStore = useTodoModalsStore()
const { t } = useI18n()

const emptyMessage = computed(() => t('todo.emptyState'))
</script>

<style scoped>
@keyframes fade-in-left {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fade-in-right {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-header-left {
  animation: fade-in-left 0.5s ease-out both;
}

.animate-header-right {
  animation: fade-in-right 0.5s ease-out 0.15s both;
}

.animate-content {
  animation: fade-in-up 0.6s ease-out 0.3s both;
}
</style>
