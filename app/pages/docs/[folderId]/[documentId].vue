<template>
  <div class="container mx-auto px-4 py-6">
    <DocsDocumentScreen
      :folder-id="folderId"
      :document-id="documentId"
    />
  </div>
</template>

<script setup lang="ts">
import { readRouteParam } from '~/utils/route-params'

const route = useRoute()
const docsStore = useDocsStore()

const folderId = readRouteParam(route.params.folderId)
const documentId = readRouteParam(route.params.documentId)

await callOnce('docs-document-page', () => docsStore.loadFolder(folderId), { mode: 'navigation' })
</script>
