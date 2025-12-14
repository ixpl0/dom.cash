<template>
  <UiDialog
    :is-open="isOpen"
    content-class="w-full max-w-lg"
    data-testid="todo-modal"
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
            data-testid="todo-modal-close"
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
              <span
                class="label-text-alt"
                :class="{ 'text-error': form.content.length > MAX_CONTENT_LENGTH }"
              >
                {{ form.content.length }} / {{ MAX_CONTENT_LENGTH }}
              </span>
            </label>
            <textarea
              ref="contentInput"
              v-model="form.content"
              class="textarea textarea-bordered w-full h-32"
              :class="{ 'textarea-error': form.content.length > MAX_CONTENT_LENGTH }"
              :placeholder="contentPlaceholder"
              data-testid="todo-modal-content-input"
            />
          </div>

          <div class="form-control mb-6">
            <label class="label pb-1">
              <span class="label-text">{{ dateLabel }}</span>
            </label>
            <input
              v-model="form.plannedDate"
              type="date"
              class="input input-bordered w-full"
              data-testid="todo-modal-date-input"
            >
          </div>

          <div
            v-if="isOwner"
            class="form-control mb-6"
          >
            <label
              v-if="connections.length > 0"
              class="label pb-1"
            >
              <span class="label-text">{{ shareLabel }}</span>
            </label>
            <div
              v-if="connections.length > 0"
              class="flex flex-col gap-2"
              data-testid="todo-modal-share-select"
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
            <label
              v-if="connections.length > 0 && form.sharedWithUserIds.length === 0"
              class="label pt-1"
            >
              <span class="label-text-alt text-base-content/60">
                {{ sharePrivate }}
              </span>
            </label>
            <p class="text-xs text-base-content/50 pt-1">
              {{ shareHint }}
            </p>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <button
              type="button"
              class="btn btn-ghost"
              data-testid="todo-modal-cancel-button"
              @click="$emit('close')"
            >
              {{ cancelText }}
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="!isValid || isSaving"
              data-testid="todo-modal-save-button"
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
import type { TodoConnection } from '~~/shared/types/todo'

const MAX_CONTENT_LENGTH = 10000

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
  shareHint: string
  cancelText: string
  saveText: string
  connections: TodoConnection[]
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
    content: string
    plannedDate: string | null
    sharedWithUserIds: string[]
  }]
}>()

const contentInput = ref<HTMLTextAreaElement | null>(null)

const extractDateOnly = (dateTimeString: string | null | undefined): string => {
  if (!dateTimeString) {
    return ''
  }
  return dateTimeString.split('T')[0] ?? ''
}

const form = reactive({
  content: props.initialContent,
  plannedDate: extractDateOnly(props.initialPlannedDate),
  sharedWithUserIds: [...props.initialSharedWithUserIds],
})

const isValid = computed(() => {
  if (!form.content.trim()) {
    return false
  }
  if (form.content.length > MAX_CONTENT_LENGTH) {
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
  emit('save', {
    content: form.content,
    plannedDate: form.plannedDate ? `${form.plannedDate}T00:00` : null,
    sharedWithUserIds: form.sharedWithUserIds,
  })
}

watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    form.content = props.initialContent
    form.plannedDate = extractDateOnly(props.initialPlannedDate)
    form.sharedWithUserIds = [...props.initialSharedWithUserIds]

    nextTick(() => {
      contentInput.value?.focus()
    })
  }
})
</script>
