<template>
  <div class="container mx-auto px-4 py-6">
    <MemoScreen />
  </div>
</template>

<script setup lang="ts">
const memoStore = useMemoStore()

await memoStore.refresh()
</script>
