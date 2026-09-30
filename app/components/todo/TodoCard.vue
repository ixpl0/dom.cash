<template>
  <UiTodoCard
    :content="todo.content"
    :is-completed="visualIsCompleted"
    :is-toggling="todoStore.isToggling(todo.id)"
    :is-overdue="isOverdue"
    :planned-date="todo.plannedDate"
    :recurrence="todo.recurrence"
    :is-owner="todo.isOwner"
    :owner-username="todo.ownerUsername"
    :shared-with="todo.sharedWith"
    :author-tooltip="t('todo.card.author')"
    :shared-with-tooltip="t('todo.card.sharedWith')"
    :recurrence-text="recurrenceText"
    @toggle="handleToggle"
    @edit="handleEdit"
    @delete="handleDelete"
  />
</template>

<script setup lang="ts">
import type { TodoListItem } from '~~/shared/types/todo'
import { isTodoOverdue } from '~~/shared/utils/todo'

interface Props {
  todo: TodoListItem
}

const props = defineProps<Props>()

const todoStore = useTodoStore()
const todoModalsStore = useTodoModalsStore()
const { confirm } = useConfirmation()
const { toast } = useToast()
const { t } = useI18n()
const { formatError } = useServerError()
const today = useToday()

const shortWeekdayNames = computed(() => [
  t('todo.recurrence.weekdayNamesShort.sun'),
  t('todo.recurrence.weekdayNamesShort.mon'),
  t('todo.recurrence.weekdayNamesShort.tue'),
  t('todo.recurrence.weekdayNamesShort.wed'),
  t('todo.recurrence.weekdayNamesShort.thu'),
  t('todo.recurrence.weekdayNamesShort.fri'),
  t('todo.recurrence.weekdayNamesShort.sat'),
])

const recurrenceText = computed(() => {
  const recurrence = props.todo.recurrence
  if (!recurrence) {
    return ''
  }

  switch (recurrence.type) {
    case 'interval': {
      return t('todo.recurrence.format.interval', {
        value: recurrence.value,
        unit: t(`todo.recurrence.format.units.${recurrence.unit}`, recurrence.value),
      })
    }
    case 'weekdays': {
      const mondayFirst = (day: number) => (day === 0 ? 7 : day)
      const sortedDays = [...recurrence.days].sort((a, b) => mondayFirst(a) - mondayFirst(b))
      return sortedDays.map(d => shortWeekdayNames.value[d]).join(', ')
    }
    case 'dayOfMonth': {
      return t('todo.recurrence.format.dayOfMonth', { day: recurrence.day })
    }
    default: {
      const exhaustiveCheck: never = recurrence
      return exhaustiveCheck
    }
  }
})

const visualIsCompleted = computed(() => {
  return props.todo.isCompleted || todoStore.isToggling(props.todo.id)
})

const isOverdue = computed(() => isTodoOverdue(props.todo, today.value))

const handleToggle = async () => {
  try {
    await todoStore.toggleTodo(props.todo.id)
  }
  catch (error) {
    toast({ type: 'error', message: formatError(error, t('todo.errors.toggleFailed')) })
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
    try {
      await todoStore.deleteTodo(props.todo.id)
    }
    catch (error) {
      toast({ type: 'error', message: formatError(error, t('todo.errors.deleteFailed')) })
    }
  }
}
</script>
