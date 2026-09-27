<template>
  <div class="container mx-auto px-4 py-6">
    <TodoScreen />
  </div>
</template>

<script setup lang="ts">
const todoStore = useTodoStore()

await callOnce('todo-page', () => todoStore.load(), { mode: 'navigation' })
</script>
