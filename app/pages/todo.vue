<template>
  <div class="container mx-auto px-4 py-6">
    <TodoScreen />
  </div>
</template>

<script setup lang="ts">
const todoStore = useTodoStore()

useNotifications()

await todoStore.refresh()
</script>
