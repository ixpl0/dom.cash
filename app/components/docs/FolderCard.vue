<template>
  <article
    class="group relative rounded-box border-2 border-transparent bg-base-200/50 p-4 transition-all duration-200 hover:border-base-300 hover:bg-base-200"
    data-testid="docs-folder-card"
  >
    <div class="flex items-start gap-3">
      <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-box bg-primary/15 text-primary">
        <Icon
          name="heroicons:folder"
          size="24"
        />
      </div>

      <div class="min-w-0 flex-1">
        <NuxtLink
          :to="`/docs/${folder.id}`"
          class="text-lg font-semibold break-words after:absolute after:inset-0 after:content-['']"
          data-testid="docs-folder-card-name"
        >
          {{ folder.name }}
        </NuxtLink>
        <p
          class="text-sm text-base-content/60"
          data-testid="docs-folder-card-count"
        >
          {{ t('docs.documentCount', { count: documentCount }, documentCount) }}
        </p>
        <p
          v-if="documentCount > 0"
          class="mt-1 line-clamp-2 text-sm text-base-content/80 break-words"
        >
          {{ documentTitles }}
        </p>
        <UiShareBadges
          class="relative z-10 mt-2 w-fit"
          :is-owner="folder.isOwner"
          :owner-username="folder.ownerUsername"
          :shared-with="folder.sharedWith"
          :author-tooltip="t('docs.author')"
          :shared-with-tooltip="t('docs.sharedWith')"
        />
      </div>

      <div class="relative z-10 flex items-center gap-1">
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square text-base-content/60 hover:text-base-content"
          :aria-label="t('docs.folder.edit')"
          data-testid="docs-folder-card-edit-button"
          @click="docsModalsStore.openFolderModal(folder.id)"
        >
          <Icon
            name="heroicons:pencil"
            size="16"
          />
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square text-base-content/60 hover:text-error"
          :aria-label="t('docs.folder.delete')"
          data-testid="docs-folder-card-delete-button"
          @click="handleDelete"
        >
          <Icon
            name="heroicons:trash"
            size="16"
          />
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { DocFolderSummary } from '~~/shared/types/docs'

interface Props {
  folder: DocFolderSummary
}

const props = defineProps<Props>()

const docsModalsStore = useDocsModalsStore()
const { confirmFolderDeletion, deleteFolder } = useDocsActions()
const { t } = useI18n()

const documentCount = computed(() => props.folder.documentTitles.length)

const documentTitles = computed(() =>
  props.folder.documentTitles.map(title => title || t('docs.document.untitled')).join(' · '))

const handleDelete = async (): Promise<void> => {
  if (await confirmFolderDeletion(props.folder)) {
    await deleteFolder(props.folder.id)
  }
}
</script>
