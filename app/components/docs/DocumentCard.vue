<template>
  <article
    class="relative rounded-box border-2 border-transparent bg-base-200/50 p-4 transition-colors duration-200 hover:border-base-300 hover:bg-base-200"
    data-testid="docs-document-card"
  >
    <div class="flex items-start justify-between gap-2">
      <NuxtLink
        :to="`/docs/${document.folderId}/${document.id}`"
        class="min-w-0 text-lg font-semibold break-words after:absolute after:inset-0 after:content-['']"
        data-testid="docs-document-card-title"
      >
        {{ getDocumentTitle(document.title) }}
      </NuxtLink>
      <button
        v-if="document.fields.length > 0"
        type="button"
        class="btn btn-ghost btn-sm btn-square relative z-10 flex-shrink-0 text-base-content/60 hover:text-base-content"
        :aria-label="t('docs.document.copyAll')"
        :title="t('docs.document.copyAll')"
        data-testid="docs-document-card-copy-all"
        @click="copyAllFields(document)"
      >
        <Icon
          name="heroicons:clipboard-document-list"
          size="18"
        />
      </button>
    </div>

    <div
      v-if="document.images.length > 0"
      class="relative z-10 mt-3 flex w-fit max-w-full gap-2 overflow-x-auto pb-1"
      data-testid="docs-document-card-photos"
    >
      <button
        v-for="image in document.images"
        :key="image.id"
        type="button"
        class="h-20 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg bg-base-300 transition-opacity duration-200 hover:opacity-80"
        :aria-label="image.fileName"
        data-testid="docs-document-card-photo"
        @click="docsModalsStore.openPhotoViewer(document.id, image.id)"
      >
        <img
          :src="getDocImagePath(image.id, 'thumbnail')"
          :alt="image.fileName"
          loading="lazy"
          class="h-full w-auto max-w-40 object-contain"
        >
      </button>
    </div>

    <DocsActivityStatus
      class="mt-3"
      :document-id="document.id"
    />
  </article>
</template>

<script setup lang="ts">
import type { DocDocument } from '~~/shared/types/docs'
import { getDocImagePath } from '~~/shared/utils/docs'

interface Props {
  document: DocDocument
}

defineProps<Props>()

const docsModalsStore = useDocsModalsStore()
const { copyAllFields, getDocumentTitle } = useDocsActions()
const { t } = useI18n()
</script>
