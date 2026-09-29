import type { TodoData, TodoListItem, CreateTodoPayload, UpdateTodoPayload, TodoConnection, TodoCompletionPayload, TodoCompletionResult, OverdueTodoCount } from '~~/shared/types/todo'
import { toLocalIsoDate } from '~~/shared/utils/shared/dates'
import { isTodoOverdue } from '~~/shared/utils/todo'
import { readServerErrorKey } from '~/utils/server-error'

export const useTodoStore = defineStore('todo', () => {
  const preferencesStore = usePreferencesStore()

  const data = ref<TodoData | null>(null)
  const connections = ref<TodoConnection[]>([])
  const serverOverdueCount = ref<number | null>(null)
  const loadError = ref<{ message: string } | null>(null)
  const isLoading = ref(false)
  const isStale = ref(false)
  const lastLoadAt = ref<number | null>(null)
  const togglingIds = ref<Set<string>>(new Set())
  const leavingIds = ref<Set<string>>(new Set())

  const hideCompleted = computed(() => preferencesStore.todoHideCompleted)

  const filteredItems = computed((): TodoListItem[] => {
    if (!data.value) {
      return []
    }
    if (hideCompleted.value) {
      return data.value.items.filter(item => !item.isCompleted || leavingIds.value.has(item.id))
    }
    return data.value.items
  })

  const getToday = (): string => toLocalIsoDate(new Date())

  const sortedItems = computed((): TodoListItem[] => {
    const today = getToday()
    const items = [...filteredItems.value]
    return items.sort((a, b) => {
      const aOverdue = isTodoOverdue(a, today)
      const bOverdue = isTodoOverdue(b, today)
      if (aOverdue && !bOverdue) {
        return -1
      }
      if (!aOverdue && bOverdue) {
        return 1
      }
      if (a.plannedDate && b.plannedDate) {
        return new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime()
      }
      if (a.plannedDate) {
        return -1
      }
      if (b.plannedDate) {
        return 1
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  })

  const overdueCount = computed((): number => {
    if (!data.value) {
      return serverOverdueCount.value ?? 0
    }
    const today = getToday()
    return data.value.items.filter(item => isTodoOverdue(item, today)).length
  })

  const getTodoById = (id: string): TodoListItem | undefined => {
    return data.value?.items.find(item => item.id === id)
  }

  const load = async (): Promise<void> => {
    const requestFetch = useRequestFetch()
    isLoading.value = data.value === null

    try {
      const [todoData, connectionsData] = await Promise.all([
        requestFetch<TodoData>('/api/todo'),
        requestFetch<TodoConnection[]>('/api/todo/connections'),
      ])

      data.value = todoData
      connections.value = connectionsData
      loadError.value = null
      isStale.value = false
    }
    catch (err) {
      if (!data.value) {
        loadError.value = { message: readServerErrorKey(err) ?? '' }
      }
    }
    finally {
      isLoading.value = false
      lastLoadAt.value = Date.now()
    }
  }

  const loadOverdueCount = async (): Promise<void> => {
    try {
      const { count } = await $fetch<OverdueTodoCount>('/api/todo/overdue-count', { query: { today: getToday() } })
      serverOverdueCount.value = count
      isStale.value = false
    }
    catch (error) {
      console.error('Failed to load the overdue task count', error)
    }
    finally {
      lastLoadAt.value = Date.now()
    }
  }

  const markStale = (): void => {
    if (data.value || serverOverdueCount.value !== null) {
      isStale.value = true
    }
  }

  const refreshIfStale = async (): Promise<void> => {
    if (!isStale.value) {
      return
    }
    isStale.value = false
    await (data.value ? load() : loadOverdueCount())
  }

  const createTodo = async (payload: CreateTodoPayload): Promise<{ id: string } | null> => {
    try {
      const result = await $fetch<TodoListItem>('/api/todo', {
        method: 'POST',
        body: payload,
      })

      if (data.value) {
        data.value = {
          items: [result, ...data.value.items],
        }
      }

      return { id: result.id }
    }
    catch {
      return null
    }
  }

  const updateTodo = async (id: string, payload: UpdateTodoPayload): Promise<boolean> => {
    try {
      const updatedItem = await $fetch<TodoListItem>(`/api/todo/${id}`, {
        method: 'PUT',
        body: payload,
      })

      if (data.value) {
        data.value = {
          items: data.value.items.map(item => item.id === id ? updatedItem : item),
        }
      }

      return true
    }
    catch {
      return false
    }
  }

  const deleteTodo = async (id: string): Promise<boolean> => {
    try {
      await $fetch(`/api/todo/${id}`, {
        method: 'DELETE',
      })
      if (data.value) {
        data.value = {
          items: data.value.items.filter(item => item.id !== id),
        }
      }
      return true
    }
    catch {
      return false
    }
  }

  const toggleTodo = async (id: string): Promise<boolean> => {
    const item = data.value?.items.find(i => i.id === id)
    if (!item) {
      return false
    }

    if (togglingIds.value.has(id)) {
      return true
    }

    const isRecurring = item.recurrence !== null
    const willBeCompleted = !item.isCompleted
    const shouldAnimateLeave = !isRecurring && willBeCompleted && hideCompleted.value
    const animationDuration = 400
    const startTime = Date.now()

    if (shouldAnimateLeave) {
      leavingIds.value = new Set([...leavingIds.value, id])
    }
    else if (!willBeCompleted) {
      leavingIds.value = new Set([...leavingIds.value].filter(i => i !== id))
    }

    togglingIds.value = new Set([...togglingIds.value, id])

    try {
      const body: TodoCompletionPayload = { isCompleted: willBeCompleted }
      const result = await $fetch<TodoCompletionResult>(`/api/todo/${id}/completion`, { method: 'PUT', body })

      const elapsed = Date.now() - startTime
      const remainingDelay = Math.max(0, animationDuration - elapsed)

      if (remainingDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingDelay))
      }

      togglingIds.value = new Set([...togglingIds.value].filter(i => i !== id))

      if (shouldAnimateLeave) {
        leavingIds.value = new Set([...leavingIds.value].filter(i => i !== id))
      }

      if (data.value) {
        data.value = {
          items: data.value.items.map(i =>
            i.id === id
              ? {
                  ...i,
                  isCompleted: result.isCompleted,
                  plannedDate: result.plannedDate ?? i.plannedDate,
                }
              : i,
          ),
        }
      }

      return true
    }
    catch {
      togglingIds.value = new Set([...togglingIds.value].filter(i => i !== id))

      if (shouldAnimateLeave) {
        leavingIds.value = new Set([...leavingIds.value].filter(i => i !== id))
      }

      return false
    }
  }

  const toggleHideCompleted = () => {
    preferencesStore.setTodoHideCompleted(!hideCompleted.value)
  }

  const isToggling = (id: string): boolean => {
    return togglingIds.value.has(id)
  }

  const isLeaving = (id: string): boolean => {
    return leavingIds.value.has(id)
  }

  return {
    data,
    connections,
    loadError,
    isLoading,
    hideCompleted,
    filteredItems,
    sortedItems,
    overdueCount,
    getTodoById,
    isToggling,
    isLeaving,
    load,
    loadOverdueCount,
    isStale,
    lastLoadAt,
    markStale,
    refreshIfStale,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    toggleHideCompleted,
  }
})
