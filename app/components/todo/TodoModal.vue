<template>
  <UiDialog
    :is-open="isOpen"
    content-class="modal-box overflow-y-auto sm:max-w-lg"
    data-testid="todo-modal"
    :title="isEditing ? t('todo.modal.editTitle') : t('todo.modal.createTitle')"
    close-button-test-id="todo-modal-close"
    @close="requestClose"
  >
    <form @submit.prevent="handleSubmit">
      <div class="form-control mb-6">
        <label class="label pb-1 w-full justify-between">
          <span class="label-text">{{ t('todo.modal.contentLabel') }}</span>
          <span
            class="label-text-alt"
            :class="{ 'text-error': form.content.length > TODO_CONTENT_MAX_LENGTH }"
            data-testid="todo-modal-content-count"
          >
            {{ form.content.length }} / {{ TODO_CONTENT_MAX_LENGTH }}
          </span>
        </label>
        <textarea
          ref="contentInput"
          v-model="form.content"
          class="textarea textarea-bordered w-full h-32"
          :class="{ 'textarea-error': form.content.length > TODO_CONTENT_MAX_LENGTH }"
          :placeholder="t('todo.modal.contentPlaceholder')"
          data-testid="todo-modal-content-input"
        />
      </div>

      <div class="form-control mb-6">
        <label class="label pb-1">
          <span class="label-text">{{ t('todo.modal.dateLabel') }}</span>
        </label>
        <input
          v-model="form.plannedDate"
          type="date"
          class="input input-bordered w-full"
          data-testid="todo-modal-date-input"
        >
      </div>

      <div class="form-control mb-6">
        <label class="label pb-1">
          <span class="label-text">{{ t('todo.recurrence.label') }}</span>
        </label>
        <UiRecurrenceSelect
          v-model="form.recurrence"
        />
      </div>

      <div
        v-if="isOwner"
        class="form-control mb-6"
      >
        <label
          v-if="shareOptions.length > 0"
          class="label pb-1"
        >
          <span class="label-text">{{ t('todo.modal.shareLabel') }}</span>
        </label>
        <div
          v-if="shareOptions.length > 0"
          class="flex flex-col gap-2"
          data-testid="todo-modal-share-select"
        >
          <label
            v-for="option in shareOptions"
            :key="option.id"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              :checked="form.sharedWithUserIds.includes(option.id)"
              data-testid="todo-modal-share-option"
              @change="toggleSharedUser(option.id)"
            >
            <span>{{ option.username }}</span>
          </label>
        </div>
        <label
          v-if="shareOptions.length > 0 && form.sharedWithUserIds.length === 0"
          class="label pt-1"
        >
          <span class="label-text-alt text-base-content/60">
            {{ t('todo.modal.sharePrivate') }}
          </span>
        </label>
        <p class="text-xs text-base-content/50 pt-1">
          {{ shareOptions.length > 0 ? t('todo.modal.shareHint') : t('todo.modal.noConnections') }}
        </p>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <button
          type="button"
          class="btn btn-ghost"
          data-testid="todo-modal-cancel-button"
          @click="closeModal"
        >
          {{ t('todo.modal.cancel') }}
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
          {{ t('todo.modal.save') }}
        </button>
      </div>
    </form>
  </UiDialog>
</template>

<script setup lang="ts">
import type { RecurrencePattern } from '~~/shared/types/recurrence'
import type { TodoConnection } from '~~/shared/types/todo'
import { TODO_CONTENT_MAX_LENGTH, todoFormSchema } from '~~/shared/schemas/todo'
import { calculateInitialDate, formatDateForDb, isSameRecurrence } from '~~/shared/utils/recurrence'

interface TodoForm {
  content: string
  plannedDate: string
  recurrence: RecurrencePattern | null
  sharedWithUserIds: string[]
}

const todoStore = useTodoStore()
const todoModalsStore = useTodoModalsStore()
const { t } = useI18n()
const { toast } = useToast()
const { formatError } = useServerError()
const { confirmDiscardChanges } = useUnsavedChanges()

const isSaving = ref(false)
const contentInput = ref<HTMLTextAreaElement | null>(null)

const isOpen = computed(() => todoModalsStore.todoModal.isOpen)

const editingTodo = computed(() => {
  const todoId = todoModalsStore.todoModal.editingTodoId
  return todoId ? todoStore.getTodoById(todoId) ?? null : null
})

const isEditing = computed(() => editingTodo.value !== null)
const isOwner = computed(() => editingTodo.value?.isOwner ?? true)

const shareOptions = computed<TodoConnection[]>(() => {
  const connectionIds = new Set(todoStore.connections.map(({ id }) => id))
  const formerConnections = (editingTodo.value?.sharedWith ?? []).filter(participant => !connectionIds.has(participant.id))
  return [...todoStore.connections, ...formerConnections]
})

const extractDateOnly = (dateTimeString: string | null | undefined): string =>
  dateTimeString ? dateTimeString.split('T')[0] ?? '' : ''

const getInitialForm = (): TodoForm => ({
  content: editingTodo.value?.content ?? '',
  plannedDate: extractDateOnly(editingTodo.value?.plannedDate),
  recurrence: editingTodo.value?.recurrence ?? null,
  sharedWithUserIds: editingTodo.value?.sharedWith.map(participant => participant.id) ?? [],
})

const initialForm = ref<TodoForm>(getInitialForm())
const form = ref<TodoForm>(getInitialForm())

const isValid = computed(() =>
  todoFormSchema.safeParse({ content: form.value.content, recurrence: form.value.recurrence }).success,
)

const hasSameUserIds = (firstUserIds: readonly string[], secondUserIds: readonly string[]): boolean =>
  firstUserIds.length === secondUserIds.length && firstUserIds.every(userId => secondUserIds.includes(userId))

const hasUnsavedChanges = computed(() =>
  form.value.content !== initialForm.value.content
  || form.value.plannedDate !== initialForm.value.plannedDate
  || !isSameRecurrence(form.value.recurrence, initialForm.value.recurrence)
  || !hasSameUserIds(form.value.sharedWithUserIds, initialForm.value.sharedWithUserIds),
)

const closeModal = (): void => {
  todoModalsStore.closeTodoModal()
}

const requestClose = async (): Promise<void> => {
  if (await confirmDiscardChanges(hasUnsavedChanges.value, 'close')) {
    closeModal()
  }
}

const toggleSharedUser = (userId: string): void => {
  const { sharedWithUserIds } = form.value
  form.value.sharedWithUserIds = sharedWithUserIds.includes(userId)
    ? sharedWithUserIds.filter(sharedUserId => sharedUserId !== userId)
    : [...sharedWithUserIds, userId]
}

const computePlannedDate = (): string | null => {
  const { plannedDate, recurrence } = form.value
  const userDate = plannedDate ? new Date(`${plannedDate}T00:00`) : null

  if (recurrence) {
    return formatDateForDb(calculateInitialDate(recurrence, userDate))
  }

  return userDate ? `${plannedDate}T00:00` : null
}

const saveTodo = async (): Promise<void> => {
  const { content, recurrence, sharedWithUserIds } = form.value
  const plannedDate = computePlannedDate()

  if (editingTodo.value) {
    await todoStore.updateTodo(editingTodo.value.id, {
      content,
      plannedDate,
      recurrence,
      ...(isOwner.value ? { sharedWithUserIds } : {}),
    })
    return
  }

  await todoStore.createTodo({
    content,
    plannedDate: plannedDate ?? undefined,
    recurrence: recurrence ?? undefined,
    sharedWithUserIds: sharedWithUserIds.length > 0 ? sharedWithUserIds : undefined,
  })
}

const handleSubmit = async (): Promise<void> => {
  if (!isValid.value || isSaving.value) {
    return
  }

  isSaving.value = true

  try {
    await saveTodo()
    closeModal()
  }
  catch (error) {
    toast({ type: 'error', message: formatError(error, t('todo.errors.saveFailed')) })
  }
  finally {
    isSaving.value = false
  }
}

watch(isOpen, (isNowOpen) => {
  if (!isNowOpen) {
    return
  }

  initialForm.value = getInitialForm()
  form.value = getInitialForm()

  nextTick(() => {
    contentInput.value?.focus()
  })
})
</script>
