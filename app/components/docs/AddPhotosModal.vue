<template>
  <UiDialog
    :is-open="isOpen"
    content-class="modal-box overflow-y-auto sm:max-w-lg"
    data-testid="docs-photos-modal"
    :title="t('docs.photosModal.title')"
    close-button-test-id="docs-photos-modal-close"
    @close="requestClose"
  >
    <form @submit.prevent="handleSubmit">
      <UiPhotoPicker
        v-model="files"
        :max-files="freeSlots"
        :max-file-size-in-megabytes="maxFileSizeInMegabytes"
        input-test-id="docs-photos-modal-input"
      />

      <p
        v-if="freeSlots === 0"
        class="mt-3 text-sm text-warning"
      >
        {{ t('docs.upload.limit', { count: DOC_MAX_IMAGES }) }}
      </p>

      <DocsRecognitionOption
        v-if="files.length > 0"
        v-model="recognize"
        class="mt-4"
        :is-available="isRecognitionAvailable"
        :file-count="files.length"
        :label="t('docs.photosModal.recognize')"
        :hint="t('docs.photosModal.recognizeHint')"
        test-id="docs-photos-modal-recognize-checkbox"
      />

      <div class="mt-6 flex justify-end gap-2">
        <button
          type="button"
          class="btn btn-ghost"
          data-testid="docs-photos-modal-cancel-button"
          @click="closeModal"
        >
          {{ t('docs.photosModal.cancel') }}
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="files.length === 0"
          data-testid="docs-photos-modal-save-button"
        >
          <Icon
            name="heroicons:arrow-up-tray"
            size="18"
          />
          {{ t('docs.photosModal.upload') }}
        </button>
      </div>
    </form>
  </UiDialog>
</template>

<script setup lang="ts">
import { DOC_IMAGE_MAX_SIZE, DOC_MAX_IMAGES } from '~~/shared/schemas/docs'

const BYTES_IN_MEGABYTE = 1024 * 1024

const docsStore = useDocsStore()
const docsModalsStore = useDocsModalsStore()
const { confirmDiscardChanges } = useUnsavedChanges()
const { t } = useI18n()

const files = ref<File[]>([])
const recognize = ref(true)

const maxFileSizeInMegabytes = DOC_IMAGE_MAX_SIZE / BYTES_IN_MEGABYTE

const isOpen = computed(() => docsModalsStore.photosModal.isOpen)
const document = computed(() => {
  const { documentId } = docsModalsStore.photosModal
  return documentId ? docsStore.getDocument(documentId) : null
})
const freeSlots = computed(() => Math.max(0, DOC_MAX_IMAGES - (document.value?.images.length ?? 0)))
const isRecognitionAvailable = computed(() => docsStore.details?.isRecognitionAvailable ?? false)

const closeModal = (): void => {
  docsModalsStore.closePhotosModal()
}

const requestClose = async (): Promise<void> => {
  if (await confirmDiscardChanges(files.value.length > 0, 'close')) {
    closeModal()
  }
}

const handleSubmit = (): void => {
  const targetDocument = document.value

  if (!targetDocument || files.value.length === 0) {
    return
  }

  const selectedFiles = files.value.slice(0, freeSlots.value)
  const shouldRecognize = recognize.value && isRecognitionAvailable.value
  closeModal()
  docsStore.uploadImages(targetDocument.id, selectedFiles, { recognize: shouldRecognize })
}

watch(isOpen, (isNowOpen) => {
  if (isNowOpen) {
    files.value = []
    recognize.value = true
  }
})
</script>
