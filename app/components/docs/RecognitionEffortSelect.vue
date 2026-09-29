<template>
  <label class="flex items-center gap-2 text-sm text-base-content/70">
    {{ t('docs.recognition.effort') }}
    <select
      v-model="effort"
      class="select select-bordered select-sm w-auto"
      :data-testid="testId"
    >
      <option
        v-for="option in DOC_RECOGNITION_EFFORTS"
        :key="option"
        :value="option"
      >
        {{ t(`docs.recognition.efforts.${option}`) }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
import { DOC_RECOGNITION_EFFORTS } from '~~/shared/schemas/docs'
import type { DocRecognitionEffort } from '~~/shared/types/docs'

interface Props {
  testId: string
}

defineProps<Props>()

const preferencesStore = usePreferencesStore()
const { t } = useI18n()

const effort = computed({
  get: () => preferencesStore.docsRecognitionEffort,
  set: (value: DocRecognitionEffort) => {
    preferencesStore.setDocsRecognitionEffort(value)
  },
})
</script>
