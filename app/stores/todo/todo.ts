import type { DateReference } from '~~/shared/types/recurrence'
import type { TodoData, TodoListItem, CreateTodoPayload, UpdateTodoPayload, TodoConnection, ToggleResult } from '~~/shared/types/todo'

export const useTodoStore = defineStore('todo', () => {
  const preferencesStore = usePreferencesStore()

  const data = ref<TodoData | null>(null)
  const connections = ref<TodoConnection[]>([])
  const loadError = ref<{ message: string } | null>(null)
  const isLoading = ref(false)
  const togglingIds = ref<Set<string>>(new Set())
  const leavingIds = ref<Set<string>>(new Set())

  const hideCompleted = computed(() => preferencesStore.todoHideCompleted)

  const isOverdue = (item: TodoListItem): boolean => {
    if (!item.plannedDate || item.isCompleted) {
      return false
    }
    const plannedDate = new Date(item.plannedDate)
    const today = new Date()
    plannedDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return plannedDate <= today
  }

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
      const aOverdue = isOverdue(a)
      const bOverdue = isOverdue(b)
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
      return 0
    }
    return data.value.items.filter(isOverdue).length
  })

  const getTodoById = (id: string): TodoListItem | undefined => {
    return data.value?.items.find(item => item.id === id)
  }

  const refresh = async () => {
    isLoading.value = true
    loadError.value = null

    try {
      const todoPromise = useFetch<TodoData>('/api/todo', { key: 'todo-list' })
      const connectionsPromise = useFetch<TodoConnection[]>('/api/todo/connections', { key: 'todo-connections' })

      const [{ data: todoData, error: todoError }, { data: connectionsData }] = await Promise.all([
        todoPromise,
        connectionsPromise,
      ])

      if (todoError.value) {
        loadError.value = { message: todoError.value.data?.message ?? '' }
        data.value = null
      }
      else {
        data.value = todoData.value || null
      }

      connections.value = connectionsData.value || []
    }
    catch {
      loadError.value = { message: '' }
    }
    finally {
      isLoading.value = false
    }
  }

  const forceRefresh = async () => {
    isLoading.value = true

    try {
      const [todoData, connectionsData] = await Promise.all([
        $fetch<TodoData>('/api/todo'),
        $fetch<TodoConnection[]>('/api/todo/connections'),
      ])

      data.value = todoData || null
      connections.value = connectionsData || []
      loadError.value = null
    }
    catch {
      if (!data.value) {
        loadError.value = { message: '' }
      }
    }
    finally {
      isLoading.value = false
    }
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

  const toggleTodo = async (id: string, reference?: DateReference): Promise<boolean> => {
    const item = data.value?.items.find(i => i.id === id)
    if (!item) {
      return false
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
      const result = await $fetch<ToggleResult>(`/api/todo/${id}/toggle`, {
        method: 'PUT',
        body: reference ? { reference } : undefined,
      })

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

  const reset = () => {
    data.value = null
    connections.value = []
    loadError.value = null
    isLoading.value = false
    togglingIds.value = new Set()
    leavingIds.value = new Set()
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
    refresh,
    forceRefresh,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    toggleHideCompleted,
    reset,
  }
})
