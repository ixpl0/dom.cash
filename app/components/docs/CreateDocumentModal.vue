<template>
  <UiDialog
    :is-open="isOpen"
    content-class="modal-box overflow-y-auto sm:max-w-lg"
    data-testid="docs-document-modal"
    :title="t('docs.createModal.title')"
    close-button-test-id="docs-document-modal-close"
    @close="requestClose"
  >
    <form @submit.prevent="handleSubmit">
      <div class="form-control mb-5">
        <label
          class="label pb-1"
          for="docs-document-title"
        >
          <span class="label-text">{{ t('docs.createModal.titleLabel') }}</span>
        </label>
        <input
          id="docs-document-title"
          ref="titleInput"
          v-model="title"
          type="text"
          class="input input-bordered w-full"
          :maxlength="DOC_TITLE_MAX_LENGTH"
          :placeholder="t('docs.createModal.titlePlaceholder')"
          data-testid="docs-document-modal-title-input"
        >
        <span
          v-if="willRecognize"
          class="pt-1 text-xs text-base-content/60"
        >
          {{ t('docs.createModal.titleHint') }}
        </span>
      </div>

      <div class="form-control mb-5">
        <span class="label pb-1">
          <span class="label-text">{{ t('docs.createModal.photosLabel') }}</span>
        </span>
        <UiPhotoPicker
          v-model="files"
          :max-files="DOC_MAX_IMAGES"
          :max-file-size-in-megabytes="maxFileSizeInMegabytes"
          input-test-id="docs-document-modal-photos-input"
        />
      </div>

      <DocsRecognitionOption
        v-if="files.length > 0"
        v-model="recognize"
        :is-available="isRecognitionAvailable"
        :file-count="files.length"
        :label="t('docs.createModal.recognize')"
        :hint="t('docs.createModal.recognizeHint')"
        test-id="docs-document-modal-recognize-checkbox"
      />

      <p
        v-if="!isValid && hasTriedToSubmit"
        class="mt-4 text-sm text-error"
        data-testid="docs-document-modal-error"
      >
        {{ t('docs.createModal.titleRequired') }}
      </p>

      <div class="mt-6 flex justify-end gap-2">
        <button
          type="button"
          class="btn btn-ghost"
          data-testid="docs-document-modal-cancel-button"
          @click="closeModal"
        >
          {{ t('docs.createModal.cancel') }}
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="isSaving"
          data-testid="docs-document-modal-save-button"
        >
          <span
            v-if="isSaving"
            class="loading loading-spinner loading-sm"
          />
          {{ t('docs.createModal.create') }}
        </button>
      </div>
    </form>
  </UiDialog>
</template>

<script setup lang="ts">
import { DOC_IMAGE_MAX_SIZE, DOC_MAX_IMAGES, DOC_TITLE_MAX_LENGTH } from '~~/shared/schemas/docs'

const BYTES_IN_MEGABYTE = 1024 * 1024

const docsStore = useDocsStore()
const docsModalsStore = useDocsModalsStore()
const { runAction } = useDocsActions()
const { confirmDiscardChanges } = useUnsavedChanges()
const { t } = useI18n()

const title = ref('')
const files = ref<File[]>([])
const recognize = ref(true)
const isSaving = ref(false)
const hasTriedToSubmit = ref(false)
const titleInput = ref<HTMLInputElement | null>(null)

const maxFileSizeInMegabytes = DOC_IMAGE_MAX_SIZE / BYTES_IN_MEGABYTE

const isOpen = computed(() => docsModalsStore.documentModal.isOpen)
const folderId = computed(() => docsModalsStore.documentModal.folderId)
const isRecognitionAvailable = computed(() => docsStore.details?.isRecognitionAvailable ?? false)
const willRecognize = computed(() => files.value.length > 0 && recognize.value && isRecognitionAvailable.value)
const isValid = computed(() => title.value.trim() !== '' || willRecognize.value)
const hasUnsavedChanges = computed(() => title.value.trim() !== '' || files.value.length > 0)

const closeModal = (): void => {
  docsModalsStore.closeDocumentModal()
}

const requestClose = async (): Promise<void> => {
  if (await confirmDiscardChanges(hasUnsavedChanges.value, 'close')) {
    closeModal()
  }
}

const handleSubmit = async (): Promise<void> => {
  hasTriedToSubmit.value = true
  const targetFolderId = folderId.value

  if (!isValid.value || isSaving.value || !targetFolderId) {
    return
  }

  isSaving.value = true

  try {
    const created = await runAction(
      () => docsStore.createDocument(targetFolderId, { title: title.value.trim() }),
      t('docs.errors.saveFailed'),
    )

    if (!created) {
      return
    }

    const selectedFiles = files.value
    const shouldRecognize = willRecognize.value
    closeModal()

    if (selectedFiles.length > 0) {
      docsStore.uploadImages(created.value.id, selectedFiles, { recognize: shouldRecognize })
    }

    await navigateTo(`/docs/${targetFolderId}/${created.value.id}`)
  }
  finally {
    isSaving.value = false
  }
}

watch(isOpen, (isNowOpen) => {
  if (!isNowOpen) {
    return
  }

  title.value = ''
  files.value = []
  recognize.value = true
  hasTriedToSubmit.value = false

  nextTick(() => {
    titleInput.value?.focus()
  })
})
</script>
