<template>
  <UiDialog
    :is-open="isOpen"
    content-class="modal-box overflow-y-auto sm:max-w-lg"
    data-testid="docs-folder-modal"
    :title="editingFolder ? t('docs.folderModal.editTitle') : t('docs.folderModal.createTitle')"
    close-button-test-id="docs-folder-modal-close"
    @close="requestClose"
  >
    <form @submit.prevent="handleSubmit">
      <div class="form-control mb-6">
        <label
          class="label pb-1"
          for="docs-folder-name"
        >
          <span class="label-text">{{ t('docs.folderModal.nameLabel') }}</span>
        </label>
        <input
          id="docs-folder-name"
          ref="nameInput"
          v-model="form.name"
          type="text"
          class="input input-bordered w-full"
          :maxlength="DOC_FOLDER_NAME_MAX_LENGTH"
          :placeholder="t('docs.folderModal.namePlaceholder')"
          data-testid="docs-folder-modal-name-input"
        >
      </div>

      <div
        v-if="isOwner"
        class="form-control mb-6"
      >
        <template v-if="connections.length > 0">
          <span class="label pb-1">
            <span class="label-text">{{ t('docs.folderModal.shareLabel') }}</span>
          </span>
          <div
            class="flex flex-col gap-2"
            data-testid="docs-folder-modal-share-select"
          >
            <label
              v-for="connection in connections"
              :key="connection.id"
              class="flex cursor-pointer items-center gap-2"
            >
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                :checked="form.sharedWithUserIds.includes(connection.id)"
                @change="toggleConnection(connection.id)"
              >
              <span class="break-all">{{ connection.username }}</span>
            </label>
          </div>
          <span
            v-if="form.sharedWithUserIds.length === 0"
            class="pt-1 text-xs text-base-content/60"
          >
            {{ t('docs.folderModal.sharePrivate') }}
          </span>
        </template>
        <p class="pt-1 text-xs text-base-content/50">
          {{ connections.length > 0 ? t('docs.folderModal.shareHint') : t('docs.folderModal.noConnections') }}
        </p>
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <button
          type="button"
          class="btn btn-ghost"
          data-testid="docs-folder-modal-cancel-button"
          @click="closeModal"
        >
          {{ t('docs.folderModal.cancel') }}
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="!isValid || isSaving"
          data-testid="docs-folder-modal-save-button"
        >
          <span
            v-if="isSaving"
            class="loading loading-spinner loading-sm"
          />
          {{ t('docs.folderModal.save') }}
        </button>
      </div>
    </form>
  </UiDialog>
</template>

<script setup lang="ts">
import { DOC_FOLDER_NAME_MAX_LENGTH, docFolderNameSchema } from '~~/shared/schemas/docs'

interface FolderForm {
  name: string
  sharedWithUserIds: string[]
}

const docsStore = useDocsStore()
const docsModalsStore = useDocsModalsStore()
const { runAction } = useDocsActions()
const { confirmDiscardChanges } = useUnsavedChanges()
const { t } = useI18n()

const isSaving = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)

const isOpen = computed(() => docsModalsStore.folderModal.isOpen)
const connections = computed(() => docsStore.connections)

const editingFolder = computed(() => {
  const folderId = docsModalsStore.folderModal.editingFolderId

  if (!folderId) {
    return null
  }

  const detailsFolder = docsStore.details?.folder.id === folderId ? docsStore.details.folder : null
  return detailsFolder ?? docsStore.folders?.find(folder => folder.id === folderId) ?? null
})

const isOwner = computed(() => editingFolder.value?.isOwner ?? true)

const getInitialForm = (): FolderForm => ({
  name: editingFolder.value?.name ?? '',
  sharedWithUserIds: editingFolder.value?.sharedWith.map(participant => participant.id) ?? [],
})

const initialForm = ref<FolderForm>(getInitialForm())
const form = ref<FolderForm>(getInitialForm())

const isValid = computed(() => docFolderNameSchema.safeParse(form.value.name).success)

const hasSameUserIds = (firstUserIds: readonly string[], secondUserIds: readonly string[]): boolean =>
  firstUserIds.length === secondUserIds.length && firstUserIds.every(userId => secondUserIds.includes(userId))

const hasUnsavedChanges = computed(() =>
  form.value.name !== initialForm.value.name
  || !hasSameUserIds(form.value.sharedWithUserIds, initialForm.value.sharedWithUserIds))

const closeModal = (): void => {
  docsModalsStore.closeFolderModal()
}

const requestClose = async (): Promise<void> => {
  if (await confirmDiscardChanges(hasUnsavedChanges.value, 'close')) {
    closeModal()
  }
}

const toggleConnection = (connectionId: string): void => {
  const { sharedWithUserIds } = form.value
  form.value.sharedWithUserIds = sharedWithUserIds.includes(connectionId)
    ? sharedWithUserIds.filter(userId => userId !== connectionId)
    : [...sharedWithUserIds, connectionId]
}

const saveFolder = async (): Promise<void> => {
  const { name, sharedWithUserIds } = form.value
  const folder = editingFolder.value

  if (folder) {
    const updated = await runAction(
      () => docsStore.updateFolder(folder.id, { name, ...(isOwner.value ? { sharedWithUserIds } : {}) }),
      t('docs.errors.saveFailed'),
    )
    if (updated) {
      closeModal()
    }
    return
  }

  const created = await runAction(() => docsStore.createFolder({ name, sharedWithUserIds }), t('docs.errors.saveFailed'))

  if (created) {
    closeModal()
    await navigateTo(`/docs/${created.value.id}`)
  }
}

const handleSubmit = async (): Promise<void> => {
  if (!isValid.value || isSaving.value) {
    return
  }

  isSaving.value = true

  try {
    await saveFolder()
  }
  finally {
    isSaving.value = false
  }
}

watch(isOpen, (isNowOpen) => {
  if (!isNowOpen) {
    return
  }

  initialForm.value = getInitialForm()
  form.value = getInitialForm()

  nextTick(() => {
    nameInput.value?.focus()
  })
})
</script>
