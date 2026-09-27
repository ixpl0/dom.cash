<template>
  <UiTodoModal
    :is-open="todoModalsStore.todoModal.isOpen"
    :is-editing="isEditing"
    :is-saving="isSaving"
    :is-owner="isOwner"
    :connections="todoStore.connections"
    :max-content-length="TODO_CONTENT_MAX_LENGTH"
    :is-form-valid="isTodoFormValid"
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
import { TODO_CONTENT_MAX_LENGTH, todoFormSchema } from '~~/shared/schemas/todo'

const todoStore = useTodoStore()
const todoModalsStore = useTodoModalsStore()
const { t } = useI18n()
const { toast } = useToast()
const { confirmDiscardChanges } = useUnsavedChanges()

const isSaving = ref(false)

const isTodoFormValid = (form: { content: string, recurrence: RecurrencePattern | null }): boolean =>
  todoFormSchema.safeParse(form).success

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

const handleClose = async (hasUnsavedChanges: boolean): Promise<void> => {
  if (!(await confirmDiscardChanges(hasUnsavedChanges, 'close'))) {
    return
  }

  todoModalsStore.closeTodoModal()
}

interface TodoFormData {
  content: string
  plannedDate: string | null
  recurrence: RecurrencePattern | null
  sharedWithUserIds: string[]
}

const saveTodo = async (data: TodoFormData): Promise<boolean> => {
  if (editingTodo.value) {
    return todoStore.updateTodo(editingTodo.value.id, {
      content: data.content,
      plannedDate: data.plannedDate,
      recurrence: data.recurrence,
      ...(isOwner.value ? { sharedWithUserIds: data.sharedWithUserIds } : {}),
    })
  }

  const createdTodo = await todoStore.createTodo({
    content: data.content,
    plannedDate: data.plannedDate ?? undefined,
    recurrence: data.recurrence ?? undefined,
    sharedWithUserIds: data.sharedWithUserIds.length > 0 ? data.sharedWithUserIds : undefined,
  })

  return createdTodo !== null
}

const handleSave = async (data: TodoFormData) => {
  isSaving.value = true

  try {
    const isSaved = await saveTodo(data)

    if (!isSaved) {
      toast({ type: 'error', message: t('todo.errors.saveFailed') })
      return
    }

    todoModalsStore.closeTodoModal()
  }
  finally {
    isSaving.value = false
  }
}
</script>
