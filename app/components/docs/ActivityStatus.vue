<template>
  <div
    v-if="activity"
    class="flex flex-col gap-2 rounded-box bg-info/10 p-3 text-sm text-info-content"
    role="status"
    data-testid="docs-activity-status"
  >
    <div class="flex items-center gap-2 text-base-content">
      <span class="loading loading-spinner loading-sm text-info" />
      <span v-if="activity.isRecognizing">{{ t('docs.recognition.inProgress') }}</span>
      <span v-else>{{ t('docs.upload.progress', { current: currentUpload, total: activity.uploadTotal }) }}</span>
    </div>
    <progress
      v-if="!activity.isRecognizing && activity.uploadTotal > 0"
      class="progress progress-info w-full"
      :value="activity.uploadDone"
      :max="activity.uploadTotal"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  documentId: string
}

const props = defineProps<Props>()

const docsStore = useDocsStore()
const { t } = useI18n()

const activity = computed(() => docsStore.getActivity(props.documentId))

const currentUpload = computed(() =>
  activity.value ? Math.min(activity.value.uploadDone + 1, activity.value.uploadTotal) : 0)
</script>
