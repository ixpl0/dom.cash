<template>
  <div class="container mx-auto px-4 py-6">
    <DocsFolderScreen :folder-id="folderId" />
  </div>
</template>

<script setup lang="ts">
import { readRouteParam } from '~/utils/route-params'

const route = useRoute()
const docsStore = useDocsStore()

const folderId = readRouteParam(route.params.folderId)

await callOnce('docs-folder-page', () => docsStore.loadFolder(folderId), { mode: 'navigation' })
</script>
