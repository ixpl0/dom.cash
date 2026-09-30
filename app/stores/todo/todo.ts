import type { TodoData, TodoListItem, CreateTodoPayload, UpdateTodoPayload, TodoConnection, TodoCompletionPayload, OverdueTodoCount } from '~~/shared/types/todo'
import { toLocalIsoDate } from '~~/shared/utils/shared/dates'
import { getSeenPlannedDate, isTodoOverdue } from '~~/shared/utils/todo'
import { readServerErrorKey } from '~/utils/server-error'

const LEAVE_ANIMATION_MS = 400

export const useTodoStore = defineStore('todo', () => {
  const preferencesStore = usePreferencesStore()
  const today = useToday()

  const data = ref<TodoData | null>(null)
  const connections = ref<TodoConnection[]>([])
  const serverOverdueCount = ref<number | null>(null)
  const hasOverdueCountFailed = ref(false)
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

  const sortedItems = computed((): TodoListItem[] => {
    const items = [...filteredItems.value]
    return items.sort((a, b) => {
      const aOverdue = isTodoOverdue(a, today.value)
      const bOverdue = isTodoOverdue(b, today.value)
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
    return data.value.items.filter(item => isTodoOverdue(item, today.value)).length
  })

  const getTodoById = (id: string): TodoListItem | undefined => {
    return data.value?.items.find(item => item.id === id)
  }

  const replaceItem = (updatedItem: TodoListItem): void => {
    if (data.value) {
      data.value = {
        items: data.value.items.map(item => item.id === updatedItem.id ? updatedItem : item),
      }
    }
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
      const { count } = await $fetch<OverdueTodoCount>('/api/todo/overdue-count', { query: { today: toLocalIsoDate(new Date()) } })
      serverOverdueCount.value = count
      hasOverdueCountFailed.value = false
      isStale.value = false
    }
    catch (error) {
      hasOverdueCountFailed.value = true
      console.error('Failed to load the overdue task count', error)
    }
    finally {
      lastLoadAt.value = Date.now()
    }
  }

  const markStale = (): void => {
    if (data.value || serverOverdueCount.value !== null || hasOverdueCountFailed.value) {
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

  watch(today, (newToday, oldToday) => {
    if (oldToday !== null && newToday !== oldToday) {
      markStale()
    }
  })

  const createTodo = async (payload: CreateTodoPayload): Promise<TodoListItem> => {
    const result = await $fetch<TodoListItem>('/api/todo', {
      method: 'POST',
      body: payload,
    })

    if (data.value) {
      data.value = {
        items: [result, ...data.value.items],
      }
    }

    return result
  }

  const updateTodo = async (id: string, payload: UpdateTodoPayload): Promise<void> => {
    const updatedItem = await $fetch<TodoListItem>(`/api/todo/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
    })

    replaceItem(updatedItem)
  }

  const deleteTodo = async (id: string): Promise<void> => {
    await $fetch(`/api/todo/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })

    if (data.value) {
      data.value = {
        items: data.value.items.filter(item => item.id !== id),
      }
    }
  }

  const removeFromSet = (ids: ReadonlySet<string>, id: string): Set<string> =>
    new Set([...ids].filter(existingId => existingId !== id))

  const waitForLeaveAnimation = async (startTime: number): Promise<void> => {
    const remainingDelay = Math.max(0, LEAVE_ANIMATION_MS - (Date.now() - startTime))

    if (remainingDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingDelay))
    }
  }

  const toggleTodo = async (id: string): Promise<void> => {
    const item = getTodoById(id)
    if (!item || togglingIds.value.has(id)) {
      return
    }

    const willBeCompleted = !item.isCompleted
    const shouldAnimateLeave = item.recurrence === null && willBeCompleted && hideCompleted.value
    const startTime = Date.now()

    if (shouldAnimateLeave) {
      leavingIds.value = new Set([...leavingIds.value, id])
    }
    else if (!willBeCompleted) {
      leavingIds.value = removeFromSet(leavingIds.value, id)
    }

    togglingIds.value = new Set([...togglingIds.value, id])

    try {
      const body: TodoCompletionPayload = { isCompleted: willBeCompleted, plannedDate: getSeenPlannedDate(item) }
      const updatedItem = await $fetch<TodoListItem>(`/api/todo/${encodeURIComponent(id)}/completion`, { method: 'PUT', body })

      await waitForLeaveAnimation(startTime)
      replaceItem(updatedItem)
    }
    finally {
      togglingIds.value = removeFromSet(togglingIds.value, id)

      if (shouldAnimateLeave) {
        leavingIds.value = removeFromSet(leavingIds.value, id)
      }
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
