<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <label
        class="btn btn-outline btn-sm"
        :class="{ 'btn-disabled': isFull }"
      >
        <Icon
          name="heroicons:photo"
          size="16"
        />
        {{ t('photoPicker.choose') }}
        <input
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          :disabled="isFull"
          :data-testid="inputTestId"
          @change="handleChange"
        >
      </label>
      <span class="text-xs text-base-content/60">
        {{ t('photoPicker.hint', { size: maxFileSizeInMegabytes }) }}
      </span>
    </div>

    <ul
      v-if="previews.length > 0"
      class="grid grid-cols-3 sm:grid-cols-4 gap-2"
      data-testid="photo-picker-previews"
    >
      <li
        v-for="(preview, index) in previews"
        :key="preview.url"
        class="relative"
      >
        <img
          v-if="!failedUrls.includes(preview.url)"
          :src="preview.url"
          :alt="preview.file.name"
          class="aspect-square w-full rounded-box bg-base-300 object-cover"
          @error="markFailed(preview.url)"
        >
        <div
          v-else
          class="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-box bg-base-300 p-2 text-center text-xs text-base-content/70"
        >
          <Icon
            name="heroicons:photo"
            size="20"
          />
          <span class="line-clamp-2 break-all">{{ preview.file.name }}</span>
        </div>
        <button
          type="button"
          class="btn btn-circle btn-xs absolute right-1 top-1"
          :aria-label="t('photoPicker.remove', { name: preview.file.name })"
          data-testid="photo-picker-remove"
          @click="removeFile(index)"
        >
          <Icon
            name="heroicons:x-mark"
            size="14"
          />
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
interface PhotoPreview {
  file: File
  url: string
}

interface Props {
  modelValue: File[]
  maxFiles: number
  maxFileSizeInMegabytes: number
  inputTestId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [files: File[]]
}>()

const { t } = useI18n()

const previews = ref<PhotoPreview[]>([])
const failedUrls = ref<string[]>([])

const isFull = computed(() => props.modelValue.length >= props.maxFiles)

const revoke = (removedPreviews: readonly PhotoPreview[]): void => {
  removedPreviews.forEach(preview => URL.revokeObjectURL(preview.url))
}

watch(() => props.modelValue, (files) => {
  const keptPreviews = previews.value.filter(preview => files.includes(preview.file))
  revoke(previews.value.filter(preview => !files.includes(preview.file)))
  previews.value = files.map(file =>
    keptPreviews.find(preview => preview.file === file) ?? { file, url: URL.createObjectURL(file) })
}, { immediate: true })

onBeforeUnmount(() => {
  revoke(previews.value)
})

const handleChange = (event: Event): void => {
  const input = event.target

  if (!(input instanceof HTMLInputElement)) {
    return
  }

  const selectedFiles = Array.from(input.files ?? [])
  input.value = ''
  emit('update:modelValue', [...props.modelValue, ...selectedFiles].slice(0, props.maxFiles))
}

const removeFile = (index: number): void => {
  emit('update:modelValue', props.modelValue.filter((_, fileIndex) => fileIndex !== index))
}

const markFailed = (url: string): void => {
  failedUrls.value = [...failedUrls.value, url]
}
</script>
