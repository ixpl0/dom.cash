<template>
  <UiDialog
    :is-open="isOpen"
    content-class="w-full max-w-lg"
    data-testid="memo-modal"
    @close="$emit('close')"
  >
    <div class="card bg-base-100">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <h2 class="card-title">
            {{ isEditing ? editTitle : createTitle }}
          </h2>
          <button
            class="btn btn-ghost btn-sm btn-square"
            data-testid="memo-modal-close"
            @click="$emit('close')"
          >
            <Icon
              name="heroicons:x-mark"
              size="20"
            />
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="form-control mb-6">
            <label class="label pb-1">
              <span class="label-text">{{ contentLabel }}</span>
            </label>
            <textarea
              ref="contentInput"
              v-model="form.content"
              class="textarea textarea-bordered w-full h-32"
              :placeholder="contentPlaceholder"
              data-testid="memo-modal-content-input"
            />
          </div>

          <div class="form-control mb-6">
            <label class="label pb-1">
              <span class="label-text">{{ dateLabel }}</span>
            </label>
            <input
              v-model="form.plannedDate"
              type="datetime-local"
              class="input input-bordered w-full"
              data-testid="memo-modal-date-input"
            >
          </div>

          <div
            v-if="isOwner && connections.length > 0"
            class="form-control mb-6"
          >
            <label class="label pb-1">
              <span class="label-text">{{ shareLabel }}</span>
            </label>
            <div
              class="flex flex-col gap-2"
              data-testid="memo-modal-share-select"
            >
              <label
                v-for="connection in connections"
                :key="connection.id"
                class="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  :checked="form.sharedWithUserIds.includes(connection.id)"
                  @change="toggleConnection(connection.id)"
                >
                <span>{{ connection.username }}</span>
              </label>
            </div>
            <label class="label pt-1">
              <span class="label-text-alt text-base-content/60">
                {{ form.sharedWithUserIds.length === 0 ? sharePrivate : '' }}
              </span>
            </label>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <button
              type="button"
              class="btn btn-ghost"
              data-testid="memo-modal-cancel-button"
              @click="$emit('close')"
            >
              {{ cancelText }}
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="!isValid || isSaving"
              data-testid="memo-modal-save-button"
            >
              <span
                v-if="isSaving"
                class="loading loading-spinner loading-sm"
              />
              {{ saveText }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
import type { MemoType, MemoConnection } from '~~/shared/types/memo'

interface Props {
  isOpen: boolean
  isEditing: boolean
  isSaving: boolean
  isOwner: boolean
  createTitle: string
  editTitle: string
  contentLabel: string
  contentPlaceholder: string
  dateLabel: string
  shareLabel: string
  sharePrivate: string
  cancelText: string
  saveText: string
  connections: MemoConnection[]
  initialContent?: string
  initialPlannedDate?: string | null
  initialSharedWithUserIds?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  initialContent: '',
  initialPlannedDate: null,
  initialSharedWithUserIds: () => [],
})

const emit = defineEmits<{
  close: []
  save: [data: {
    type: MemoType
    content: string
    plannedDate: string | null
    sharedWithUserIds: string[]
  }]
}>()

const contentInput = ref<HTMLTextAreaElement | null>(null)

const form = reactive({
  content: props.initialContent,
  plannedDate: props.initialPlannedDate ?? '',
  sharedWithUserIds: [...props.initialSharedWithUserIds],
})

const isValid = computed(() => {
  if (!form.content.trim()) {
    return false
  }
  return true
})

const toggleConnection = (connectionId: string) => {
  if (form.sharedWithUserIds.includes(connectionId)) {
    form.sharedWithUserIds = form.sharedWithUserIds.filter(id => id !== connectionId)
  }
  else {
    form.sharedWithUserIds = [...form.sharedWithUserIds, connectionId]
  }
}

const handleSubmit = () => {
  if (!isValid.value || props.isSaving) {
    return
  }
  const plannedDate = form.plannedDate || null
  const type: MemoType = plannedDate ? 'plan' : 'todo'
  emit('save', {
    type,
    content: form.content,
    plannedDate,
    sharedWithUserIds: form.sharedWithUserIds,
  })
}

watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    form.content = props.initialContent
    form.plannedDate = props.initialPlannedDate ?? ''
    form.sharedWithUserIds = [...props.initialSharedWithUserIds]

    nextTick(() => {
      contentInput.value?.focus()
    })
  }
})
</script>
