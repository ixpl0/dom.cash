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
  await todoStore.forceRefresh()
  hideWarningBanner()
})

await todoStore.refresh()
</script>
