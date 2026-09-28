<template>
  <div
    class="rounded-box bg-base-200/60 p-3"
    data-testid="docs-recognition-option"
  >
    <label
      v-if="isAvailable"
      class="flex cursor-pointer items-start gap-3"
    >
      <input
        type="checkbox"
        class="checkbox checkbox-primary checkbox-sm mt-0.5"
        :checked="modelValue"
        :data-testid="testId"
        @change="emit('update:modelValue', !modelValue)"
      >
      <span class="flex flex-col gap-1">
        <span class="flex items-center gap-1 text-sm font-medium">
          <Icon
            name="heroicons:sparkles"
            size="16"
            class="text-primary"
          />
          {{ label }}
        </span>
        <span
          v-if="modelValue"
          class="text-xs text-base-content/60"
        >
          {{ hint }}
        </span>
        <span
          v-if="modelValue && fileCount > DOC_MAX_RECOGNITION_IMAGES"
          class="text-xs text-warning"
        >
          {{ t('docs.recognition.limitHint', { count: DOC_MAX_RECOGNITION_IMAGES }) }}
        </span>
      </span>
    </label>
    <p
      v-else
      class="flex items-center gap-2 text-xs text-base-content/60"
      data-testid="docs-recognition-unavailable"
    >
      <Icon
        name="heroicons:sparkles"
        size="16"
      />
      {{ t('docs.recognition.unavailable') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { DOC_MAX_RECOGNITION_IMAGES } from '~~/shared/schemas/docs'

interface Props {
  modelValue: boolean
  isAvailable: boolean
  fileCount: number
  label: string
  hint: string
  testId: string
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { t } = useI18n()
</script>
