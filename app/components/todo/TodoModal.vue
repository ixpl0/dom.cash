<template>
  <UiTodoModal
    :is-open="todoModalsStore.todoModal.isOpen"
    :is-editing="isEditing"
    :is-saving="isSaving"
    :is-owner="isOwner"
    :create-title="t('todo.modal.createTitle')"
    :edit-title="t('todo.modal.editTitle')"
    :content-label="t('todo.modal.contentLabel')"
    :content-placeholder="t('todo.modal.contentPlaceholder')"
    :date-label="t('todo.modal.dateLabel')"
    :recurrence-label="t('todo.recurrence.label')"
    :recurrence-none-label="t('todo.recurrence.none')"
    :recurrence-interval-label="t('todo.recurrence.interval')"
    :recurrence-weekdays-label="t('todo.recurrence.weekdays')"
    :recurrence-day-of-month-label="t('todo.recurrence.dayOfMonth')"
    :recurrence-unit-day-label="t('todo.recurrence.units.day')"
    :recurrence-unit-week-label="t('todo.recurrence.units.week')"
    :recurrence-unit-month-label="t('todo.recurrence.units.month')"
    :recurrence-unit-year-label="t('todo.recurrence.units.year')"
    :recurrence-weekday-names="weekdayNames"
    :recurrence-day-of-month-prefix="t('todo.recurrence.dayOfMonthPrefix')"
    :recurrence-day-of-month-suffix="t('todo.recurrence.dayOfMonthSuffix')"
    :share-label="t('todo.modal.shareLabel')"
    :share-private="t('todo.modal.sharePrivate')"
    :share-hint="todoStore.connections.length > 0 ? t('todo.modal.shareHint') : t('todo.modal.noConnections')"
    :cancel-text="t('todo.modal.cancel')"
    :save-text="t('todo.modal.save')"
    :connections="todoStore.connections"
    :initial-content="initialContent"
    :initial-planned-date="initialPlannedDate"
    :initial-recurrence="initialRecurrence"
    :initial-shared-with-user-ids="initialSharedWithUserIds"
    @close="handleClose"
    @save="handleSave"
  />
</template>

<script setup lang="ts">
import type { RecurrencePattern } from '~~/shared/types/recurrence'

const todoStore = useTodoStore()
const todoModalsStore = useTodoModalsStore()
const { t } = useI18n()

const isSaving = ref(false)

const weekdayNames = computed(() => [
  t('todo.recurrence.weekdayNames.mon'),
  t('todo.recurrence.weekdayNames.tue'),
  t('todo.recurrence.weekdayNames.wed'),
  t('todo.recurrence.weekdayNames.thu'),
  t('todo.recurrence.weekdayNames.fri'),
  t('todo.recurrence.weekdayNames.sat'),
  t('todo.recurrence.weekdayNames.sun'),
])

const editingTodo = computed(() => {
  const todoId = todoModalsStore.todoModal.editingTodoId
  if (!todoId) {
    return null
  }
  return todoStore.getTodoById(todoId) ?? null
})

const isEditing = computed(() => !!editingTodo.value)
const isOwner = computed(() => editingTodo.value?.isOwner ?? true)

const initialContent = computed(() => editingTodo.value?.content ?? '')
const initialPlannedDate = computed(() => editingTodo.value?.plannedDate ?? null)
const initialRecurrence = computed(() => editingTodo.value?.recurrence ?? null)
const initialSharedWithUserIds = computed(() =>
  editingTodo.value?.sharedWith.map(s => s.id) ?? [],
)

const handleClose = () => {
  todoModalsStore.closeTodoModal()
}

const handleSave = async (data: {
  content: string
  plannedDate: string | null
  recurrence: RecurrencePattern | null
  sharedWithUserIds: string[]
}) => {
  isSaving.value = true

  try {
    if (editingTodo.value) {
      await todoStore.updateTodo(editingTodo.value.id, {
        content: data.content,
        plannedDate: data.plannedDate,
        recurrence: data.recurrence,
        sharedWithUserIds: data.sharedWithUserIds,
      })
    }
    else {
      await todoStore.createTodo({
        content: data.content,
        plannedDate: data.plannedDate ?? undefined,
        recurrence: data.recurrence ?? undefined,
        sharedWithUserIds: data.sharedWithUserIds.length > 0 ? data.sharedWithUserIds : undefined,
      })
    }
    handleClose()
  }
  finally {
    isSaving.value = false
  }
}
</script>
