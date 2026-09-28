<template>
  <div data-testid="docs-page">
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold animate-fade-in-left">
        {{ t('docs.title') }}
      </h1>

      <button
        type="button"
        class="btn btn-primary animate-fade-in-right-delayed"
        data-testid="docs-add-folder-button"
        @click="docsModalsStore.openFolderModal()"
      >
        <Icon
          name="heroicons:folder-plus"
          size="20"
        />
        {{ t('docs.addFolder') }}
      </button>
    </div>

    <div
      v-if="docsStore.isLoadingFolders"
      class="flex justify-center py-8"
    >
      <span class="loading loading-spinner loading-lg" />
    </div>

    <div
      v-else-if="docsStore.foldersError"
      class="alert alert-error"
      data-testid="docs-load-error"
    >
      {{ formatError(docsStore.foldersError, t('docs.errors.loadFailed')) }}
    </div>

    <div
      v-else-if="folders.length === 0"
      class="flex flex-col items-center py-12 text-center text-base-content/60 animate-fade-in-up-delayed-2"
      data-testid="docs-empty-state"
    >
      <Icon
        name="heroicons:folder-open"
        size="48"
        class="mb-3 opacity-50"
      />
      <p class="max-w-md">
        {{ t('docs.emptyState') }}
      </p>
    </div>

    <div
      v-else
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 animate-fade-in-up-delayed-2"
      data-testid="docs-folder-list"
    >
      <DocsFolderCard
        v-for="folder in folders"
        :key="folder.id"
        :folder="folder"
      />
    </div>

    <DocsFolderModal />
  </div>
</template>

<script setup lang="ts">
const docsStore = useDocsStore()
const docsModalsStore = useDocsModalsStore()
const { t } = useI18n()
const { formatError } = useServerError()

const folders = computed(() => docsStore.folders ?? [])
</script>
