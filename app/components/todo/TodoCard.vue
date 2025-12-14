<template>
  <UiTodoCard
    :content="todo.content"
    :is-completed="todo.isCompleted"
    :planned-date="todo.plannedDate"
    :is-owner="todo.isOwner"
    :owner-username="todo.ownerUsername"
    :shared-with="todo.sharedWith"
    :author-tooltip="t('todo.card.author')"
    :shared-with-tooltip="t('todo.card.sharedWith')"
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
const { t } = useI18n()

const handleToggle = async () => {
  await todoStore.toggleTodo(props.todo.id)
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
    await todoStore.deleteTodo(props.todo.id)
  }
}
</script>
