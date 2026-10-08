<template>
  <div class="container mx-auto px-4 py-6">
    <TodoScreen />
  </div>
</template>

<script setup lang="ts">
import { closeTodoDigestNotifications } from '~/utils/push'

const todoStore = useTodoStore()

await callOnce('todo-page', () => todoStore.load(), { mode: 'navigation' })

onMounted(() => {
  closeTodoDigestNotifications().catch((error: unknown) => {
    console.error('Failed to close the task digest notifications', error)
  })
})
</script>
