<template>
  <div
    class="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-2 xl:grid-cols-3"
    data-testid="docs-photo-gallery"
  >
    <div
      v-for="(image, index) in document.images"
      :key="image.id"
      class="relative w-44 flex-shrink-0 sm:w-auto"
      data-testid="docs-photo"
    >
      <button
        type="button"
        class="block aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-lg bg-base-300 transition-opacity duration-200 hover:opacity-85"
        :aria-label="image.fileName"
        data-testid="docs-photo-open"
        @click="docsModalsStore.openPhotoViewer(document.id, image.id)"
      >
        <img
          :src="getDocImagePath(image.id, 'thumbnail')"
          :alt="image.fileName"
          loading="lazy"
          class="h-full w-full object-contain"
        >
      </button>

      <div
        v-if="isEditing"
        class="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1"
      >
        <div class="join">
          <button
            type="button"
            class="btn join-item btn-xs"
            :disabled="index === 0 || isReordering"
            :aria-label="t('docs.document.movePhotoBack')"
            data-testid="docs-photo-move-back"
            @click="movePhoto(index, -1)"
          >
            <Icon
              name="heroicons:chevron-left"
              size="14"
            />
          </button>
          <button
            type="button"
            class="btn join-item btn-xs"
            :disabled="index === document.images.length - 1 || isReordering"
            :aria-label="t('docs.document.movePhotoForward')"
            data-testid="docs-photo-move-forward"
            @click="movePhoto(index, 1)"
          >
            <Icon
              name="heroicons:chevron-right"
              size="14"
            />
          </button>
        </div>
        <button
          type="button"
          class="btn btn-error btn-xs"
          :aria-label="t('docs.document.removePhoto')"
          data-testid="docs-photo-delete"
          @click="deleteImage(image.id)"
        >
          <Icon
            name="heroicons:trash"
            size="14"
          />
        </button>
      </div>
    </div>

    <div
      v-for="placeholder in pendingUploadCount"
      :key="`pending-${placeholder}`"
      class="skeleton flex aspect-[4/3] w-44 flex-shrink-0 items-center justify-center rounded-lg sm:w-full"
      data-testid="docs-photo-placeholder"
    >
      <span class="loading loading-spinner loading-sm opacity-60" />
    </div>

    <button
      v-if="canAddPhotos"
      type="button"
      class="flex aspect-[4/3] w-44 flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-base-300 text-base-content/60 transition-colors duration-200 hover:border-primary hover:text-primary sm:w-full"
      data-testid="docs-add-photos-button"
      @click="emit('add')"
    >
      <Icon
        name="heroicons:camera"
        size="24"
      />
      <span class="text-sm">{{ t('docs.document.addPhotos') }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { DocDocument } from '~~/shared/types/docs'
import { getDocImagePath } from '~~/shared/utils/docs'

interface Props {
  document: DocDocument
  isEditing: boolean
  canAddPhotos: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  add: []
}>()

const docsStore = useDocsStore()
const docsModalsStore = useDocsModalsStore()
const { deleteImage, runAction } = useDocsActions()
const { t } = useI18n()

const isReordering = ref(false)

const pendingUploadCount = computed(() => {
  const activity = docsStore.getActivity(props.document.id)
  return activity ? Math.max(0, activity.uploadTotal - activity.uploadDone) : 0
})

const movePhoto = async (index: number, offset: number): Promise<void> => {
  const imageIds = props.document.images.map(({ id }) => id)
  const movedImageId = imageIds[index]
  const targetImageId = imageIds[index + offset]

  if (!movedImageId || !targetImageId) {
    return
  }

  const reorderedImageIds = imageIds.map((imageId) => {
    if (imageId === movedImageId) {
      return targetImageId
    }
    return imageId === targetImageId ? movedImageId : imageId
  })

  isReordering.value = true

  try {
    await runAction(() => docsStore.reorderImages(props.document.id, reorderedImageIds), t('docs.errors.reorderFailed'))
  }
  finally {
    isReordering.value = false
  }
}
</script>
