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
    :share-label="t('todo.modal.shareLabel')"
    :share-private="t('todo.modal.sharePrivate')"
    :share-hint="todoStore.connections.length > 0 ? t('todo.modal.shareHint') : t('todo.modal.noConnections')"
    :cancel-text="t('todo.modal.cancel')"
    :save-text="t('todo.modal.save')"
    :connections="todoStore.connections"
    :initial-content="initialContent"
    :initial-planned-date="initialPlannedDate"
    :initial-shared-with-user-ids="initialSharedWithUserIds"
    @close="handleClose"
    @save="handleSave"
  />
</template>

<script setup lang="ts">
const todoStore = useTodoStore()
const todoModalsStore = useTodoModalsStore()
const { t } = useI18n()

const isSaving = ref(false)

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
const initialSharedWithUserIds = computed(() =>
  editingTodo.value?.sharedWith.map(s => s.id) ?? [],
)

const handleClose = () => {
  todoModalsStore.closeTodoModal()
}

const handleSave = async (data: {
  content: string
  plannedDate: string | null
  sharedWithUserIds: string[]
}) => {
  isSaving.value = true

  try {
    if (editingTodo.value) {
      await todoStore.updateTodo(editingTodo.value.id, {
        content: data.content,
        plannedDate: data.plannedDate,
        sharedWithUserIds: data.sharedWithUserIds,
      })
    }
    else {
      await todoStore.createTodo({
        content: data.content,
        plannedDate: data.plannedDate ?? undefined,
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
