<template>
  <div data-testid="docs-folder-page">
    <NuxtLink
      to="/docs"
      class="btn btn-ghost btn-sm -ml-3 mb-2 gap-1"
      data-testid="docs-back-to-folders"
    >
      <Icon
        name="heroicons:chevron-left"
        size="16"
      />
      {{ t('docs.folder.back') }}
    </NuxtLink>

    <div
      v-if="isLoading"
      class="flex justify-center py-8"
    >
      <span class="loading loading-spinner loading-lg" />
    </div>

    <div
      v-else-if="!details"
      class="alert alert-error"
      data-testid="docs-folder-error"
    >
      {{ loadErrorMessage }}
    </div>

    <template v-else>
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0 animate-fade-in-left">
          <h1
            class="text-2xl font-bold break-words"
            data-testid="docs-folder-title"
          >
            {{ details.folder.name }}
          </h1>
          <UiShareBadges
            class="mt-1"
            :is-owner="details.folder.isOwner"
            :owner-username="details.folder.ownerUsername"
            :shared-with="details.folder.sharedWith"
            :author-tooltip="t('docs.author')"
            :shared-with-tooltip="t('docs.sharedWith')"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2 animate-fade-in-right-delayed">
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square"
            :aria-label="t('docs.folder.edit')"
            :title="t('docs.folder.edit')"
            data-testid="docs-folder-edit-button"
            @click="docsModalsStore.openFolderModal(folderId)"
          >
            <Icon
              name="heroicons:cog-6-tooth"
              size="18"
            />
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square hover:text-error"
            :aria-label="t('docs.folder.delete')"
            :title="t('docs.folder.delete')"
            data-testid="docs-folder-delete-button"
            @click="handleDelete"
          >
            <Icon
              name="heroicons:trash"
              size="18"
            />
          </button>
          <button
            type="button"
            class="btn btn-primary"
            data-testid="docs-add-document-button"
            @click="docsModalsStore.openDocumentModal(folderId)"
          >
            <Icon
              name="heroicons:document-plus"
              size="20"
            />
            {{ t('docs.folder.addDocument') }}
          </button>
        </div>
      </div>

      <div
        v-if="details.documents.length === 0"
        class="flex flex-col items-center py-12 text-center text-base-content/60 animate-fade-in-up-delayed-2"
        data-testid="docs-folder-empty-state"
      >
        <Icon
          name="heroicons:identification"
          size="48"
          class="mb-3 opacity-50"
        />
        <p class="max-w-md">
          {{ t('docs.folder.emptyState') }}
        </p>
      </div>

      <div
        v-else
        class="columns-1 gap-4 md:columns-2 xl:columns-3 animate-fade-in-up-delayed-2"
        data-testid="docs-document-list"
      >
        <div
          v-for="document in details.documents"
          :key="document.id"
          class="mb-4 break-inside-avoid"
        >
          <DocsDocumentCard :document="document" />
        </div>
      </div>
    </template>

    <DocsFolderModal />
    <DocsCreateDocumentModal />
    <DocsPhotoViewer />
  </div>
</template>

<script setup lang="ts">
interface Props {
  folderId: string
}

const props = defineProps<Props>()

const docsStore = useDocsStore()
const docsModalsStore = useDocsModalsStore()
const { deleteFolder } = useDocsActions()
const { formatError } = useServerError()
const { t } = useI18n()

const details = computed(() => docsStore.details?.folder.id === props.folderId ? docsStore.details : null)

const isLoading = computed(() => !details.value && docsStore.detailsError?.folderId !== props.folderId)

const loadErrorMessage = computed(() => formatError(docsStore.detailsError, t('docs.folder.notFound')))

const handleDelete = async (): Promise<void> => {
  if (details.value && await deleteFolder(details.value.folder)) {
    await navigateTo('/docs')
  }
}
</script>
