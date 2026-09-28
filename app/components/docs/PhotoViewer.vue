<template>
  <UiDialog
    :is-open="isOpen && image !== null"
    content-class="modal-box w-full max-w-5xl"
    data-testid="docs-photo-viewer"
    :title="t('docs.viewer.title', { current: imageIndex + 1, total: images.length })"
    close-button-test-id="docs-photo-viewer-close"
    @close="docsModalsStore.closePhotoViewer()"
  >
    <div
      v-if="image"
      class="flex flex-col gap-4"
    >
      <div class="relative flex min-h-[40vh] items-center justify-center overflow-hidden rounded-box bg-base-300">
        <img
          :key="imageSource"
          :src="imageSource"
          :alt="image.fileName"
          class="max-h-[65vh] w-auto max-w-full object-contain"
          data-testid="docs-photo-viewer-image"
          @load="isLoading = false"
          @error="handleImageError"
        >
        <span
          v-if="isLoading"
          class="loading loading-spinner loading-lg absolute"
        />
        <button
          v-if="imageIndex > 0"
          type="button"
          class="btn btn-circle btn-sm absolute left-2 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
          :aria-label="t('docs.viewer.previous')"
          data-testid="docs-photo-viewer-previous"
          @click="showImageAt(imageIndex - 1)"
        >
          <Icon
            name="heroicons:chevron-left"
            size="18"
          />
        </button>
        <button
          v-if="imageIndex < images.length - 1"
          type="button"
          class="btn btn-circle btn-sm absolute right-2 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
          :aria-label="t('docs.viewer.next')"
          data-testid="docs-photo-viewer-next"
          @click="showImageAt(imageIndex + 1)"
        >
          <Icon
            name="heroicons:chevron-right"
            size="18"
          />
        </button>
      </div>

      <p class="text-sm text-base-content/60 break-all">
        {{ image.fileName }} · {{ formatFileSize(image.size, locale) }}
        <template v-if="image.width && image.height">
          · {{ image.width }}×{{ image.height }}
        </template>
      </p>
      <p
        v-if="isShowingPreview"
        class="text-sm text-warning"
        data-testid="docs-photo-viewer-preview-notice"
      >
        {{ t('docs.viewer.previewShown') }}
      </p>

      <div class="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          class="btn btn-sm"
          :disabled="isCopying"
          data-testid="docs-photo-viewer-copy"
          @click="copyImage"
        >
          <span
            v-if="isCopying"
            class="loading loading-spinner loading-xs"
          />
          <Icon
            v-else
            name="heroicons:clipboard-document"
            size="16"
          />
          {{ t('docs.viewer.copy') }}
        </button>
        <a
          class="btn btn-sm"
          :href="`${originalPath}?download=1`"
          download
          data-testid="docs-photo-viewer-download"
        >
          <Icon
            name="heroicons:arrow-down-tray"
            size="16"
          />
          {{ t('docs.viewer.download') }}
        </a>
        <a
          class="btn btn-sm"
          :href="originalPath"
          target="_blank"
          rel="noopener"
          data-testid="docs-photo-viewer-open"
        >
          <Icon
            name="heroicons:arrow-top-right-on-square"
            size="16"
          />
          {{ t('docs.viewer.openOriginal') }}
        </a>
        <button
          type="button"
          class="btn btn-ghost btn-sm text-error"
          data-testid="docs-photo-viewer-delete"
          @click="handleDelete"
        >
          <Icon
            name="heroicons:trash"
            size="16"
          />
          {{ t('docs.viewer.delete') }}
        </button>
      </div>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
import { getDocImagePath } from '~~/shared/utils/docs'
import { copyImageFromUrl } from '~/utils/clipboard'
import { formatFileSize } from '~/utils/file-size'

const docsStore = useDocsStore()
const docsModalsStore = useDocsModalsStore()
const { deleteImage } = useDocsActions()
const { toast } = useToast()
const { t, locale } = useI18n()

const isLoading = ref(true)
const isShowingPreview = ref(false)
const isCopying = ref(false)

const isOpen = computed(() => docsModalsStore.photoViewer.isOpen)

const images = computed(() => {
  const { documentId } = docsModalsStore.photoViewer
  return documentId ? docsStore.getDocument(documentId)?.images ?? [] : []
})

const imageIndex = computed(() => images.value.findIndex(({ id }) => id === docsModalsStore.photoViewer.imageId))

const image = computed(() => images.value[imageIndex.value] ?? null)

const originalPath = computed(() => image.value ? getDocImagePath(image.value.id, 'original') : '')

const imageSource = computed(() => {
  if (!image.value) {
    return ''
  }
  return getDocImagePath(image.value.id, isShowingPreview.value ? 'preview' : 'original')
})

const showImageAt = (index: number): void => {
  const nextImage = images.value[index]
  if (nextImage) {
    docsModalsStore.showPhoto(nextImage.id)
  }
}

const handleImageError = (): void => {
  if (isShowingPreview.value) {
    isLoading.value = false
    return
  }
  isShowingPreview.value = true
}

const copyImage = async (): Promise<void> => {
  if (!image.value) {
    return
  }

  isCopying.value = true

  try {
    const { id } = image.value
    const isCopied = await copyImageFromUrl(getDocImagePath(id, 'original')) || await copyImageFromUrl(getDocImagePath(id, 'preview'))
    toast(isCopied
      ? { type: 'success', message: t('docs.viewer.copied'), timeout: 2000 }
      : { type: 'error', message: t('docs.copy.failed') })
  }
  finally {
    isCopying.value = false
  }
}

const handleDelete = async (): Promise<void> => {
  if (!image.value) {
    return
  }

  const deletedIndex = imageIndex.value

  if (!await deleteImage(image.value.id)) {
    return
  }

  const nextImage = images.value[Math.min(deletedIndex, images.value.length - 1)]

  if (nextImage) {
    docsModalsStore.showPhoto(nextImage.id)
  }
  else {
    docsModalsStore.closePhotoViewer()
  }
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'ArrowLeft') {
    showImageAt(imageIndex.value - 1)
  }
  else if (event.key === 'ArrowRight') {
    showImageAt(imageIndex.value + 1)
  }
}

watch(() => image.value?.id, () => {
  isLoading.value = true
  isShowingPreview.value = false
})

watch(isOpen, (isNowOpen) => {
  if (isNowOpen) {
    window.addEventListener('keydown', handleKeydown)
  }
  else {
    window.removeEventListener('keydown', handleKeydown)
  }
})

watch(() => isOpen.value && images.value.length === 0, (hasNoImages) => {
  if (hasNoImages) {
    docsModalsStore.closePhotoViewer()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  docsModalsStore.closePhotoViewer()
})
</script>
