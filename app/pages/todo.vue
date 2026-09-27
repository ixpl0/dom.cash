<template>
  <div class="container mx-auto px-4 py-6">
    <TodoScreen />
  </div>
</template>

<script setup lang="ts">
const todoStore = useTodoStore()
const { hideWarningBanner } = useOutdatedBanner()

useNotifications()

useVisibilityRefresh(async () => {
  await todoStore.load()
  hideWarningBanner()
})

const isLoadedByAuthPlugin = import.meta.server && todoStore.data !== null

await callOnce('todo-page', () => isLoadedByAuthPlugin ? undefined : todoStore.load(), { mode: 'navigation' })
</script>
