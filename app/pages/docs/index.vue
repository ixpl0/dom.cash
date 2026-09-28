<template>
  <div class="container mx-auto px-4 py-6">
    <DocsFoldersScreen />
  </div>
</template>

<script setup lang="ts">
const docsStore = useDocsStore()

await callOnce('docs-page', () => docsStore.loadFolders(), { mode: 'navigation' })
</script>
