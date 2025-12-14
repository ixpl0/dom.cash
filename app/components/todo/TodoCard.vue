<template>
  <UiTodoCard
    :content="todo.content"
    :is-completed="visualIsCompleted"
    :planned-date="todo.plannedDate"
    :recurrence="todo.recurrence"
    :is-owner="todo.isOwner"
    :owner-username="todo.ownerUsername"
    :shared-with="todo.sharedWith"
    :author-tooltip="t('todo.card.author')"
    :shared-with-tooltip="t('todo.card.sharedWith')"
    :recurrence-tooltip="t('todo.card.recurrence')"
    @toggle="handleToggle"
    @edit="handleEdit"
    @delete="handleDelete"
  />
</template>

<script setup lang="ts">
import type { TodoListItem } from '~~/shared/types/todo'

interface Props {
  todo: TodoListItem
}

const props = defineProps<Props>()

const todoStore = useTodoStore()
const todoModalsStore = useTodoModalsStore()
const { confirm } = useConfirmation()
const { toast } = useToast()
const { t } = useI18n()

const visualIsCompleted = computed(() => {
  return props.todo.isCompleted || todoStore.isToggling(props.todo.id)
})

const handleToggle = async () => {
  const reference = props.todo.recurrence ? 'planned' : undefined
  const success = await todoStore.toggleTodo(props.todo.id, reference)
  if (!success) {
    toast({ type: 'error', message: t('todo.errors.toggleFailed') })
  }
}

const handleEdit = () => {
  todoModalsStore.openTodoModal(props.todo.id)
}

const handleDelete = async () => {
  const confirmed = await confirm({
    title: t('todo.delete.title'),
    message: t('todo.delete.message'),
    variant: 'danger',
    confirmText: t('todo.delete.confirm'),
    icon: 'heroicons:trash',
  })

  if (confirmed) {
    const success = await todoStore.deleteTodo(props.todo.id)
    if (!success) {
      toast({ type: 'error', message: t('todo.errors.deleteFailed') })
    }
  }
}
</script>
