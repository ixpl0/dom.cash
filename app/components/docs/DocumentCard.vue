<template>
  <article
    class="rounded-box bg-base-200/50 p-4 transition-colors duration-200 hover:bg-base-200"
    data-testid="docs-document-card"
  >
    <div class="flex items-start justify-between gap-2">
      <NuxtLink
        :to="documentPath"
        class="group/title inline-flex min-w-0 items-center gap-1 text-lg font-semibold"
        data-testid="docs-document-card-title"
      >
        <span class="break-words group-hover/title:underline">{{ getDocumentTitle(document.title) }}</span>
        <Icon
          name="heroicons:chevron-right"
          size="16"
          class="flex-shrink-0 opacity-50 transition-transform duration-200 group-hover/title:translate-x-0.5"
        />
      </NuxtLink>
      <button
        v-if="document.fields.length > 0"
        type="button"
        class="btn btn-ghost btn-sm btn-square flex-shrink-0 text-base-content/60 hover:text-base-content"
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
      class="mt-3 flex gap-2 overflow-x-auto pb-1"
      data-testid="docs-document-card-photos"
    >
      <button
        v-for="image in document.images"
        :key="image.id"
        type="button"
        class="h-20 flex-shrink-0 overflow-hidden rounded-lg bg-base-300 transition-opacity duration-200 hover:opacity-80"
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

    <DocsFieldList
      v-if="shownFields.length > 0"
      class="mt-3"
      :fields="shownFields"
    />
    <p
      v-else
      class="mt-3 text-sm text-base-content/60"
    >
      {{ t('docs.document.noFields') }}
    </p>

    <NuxtLink
      v-if="hiddenFieldCount > 0"
      :to="documentPath"
      class="link link-primary mt-2 inline-block text-sm"
      data-testid="docs-document-card-more"
    >
      {{ t('docs.document.moreFields', { count: hiddenFieldCount }, hiddenFieldCount) }}
    </NuxtLink>
  </article>
</template>

<script setup lang="ts">
import type { DocDocument } from '~~/shared/types/docs'
import { getDocImagePath } from '~~/shared/utils/docs'

interface Props {
  document: DocDocument
}

const props = defineProps<Props>()

const SHOWN_FIELD_COUNT = 5

const docsModalsStore = useDocsModalsStore()
const { copyAllFields, getDocumentTitle } = useDocsActions()
const { t } = useI18n()

const documentPath = computed(() => `/docs/${props.document.folderId}/${props.document.id}`)

const shownFields = computed(() => props.document.fields.slice(0, SHOWN_FIELD_COUNT))

const hiddenFieldCount = computed(() => props.document.fields.length - shownFields.value.length)
</script>
