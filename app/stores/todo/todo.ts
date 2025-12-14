import type { TodoData, TodoListItem, CreateTodoPayload, UpdateTodoPayload, TodoConnection } from '~~/shared/types/todo'

export const useTodoStore = defineStore('todo', () => {
  const data = ref<TodoData | null>(null)
  const connections = ref<TodoConnection[]>([])
  const error = ref<string | null>(null)
  const isLoading = ref(false)
  const hideCompleted = ref(true)

  const isOverdue = (item: TodoListItem): boolean => {
    if (!item.plannedDate || item.isCompleted) {
      return false
    }
    return new Date(item.plannedDate) <= new Date()
  }

  const filteredItems = computed((): TodoListItem[] => {
    if (!data.value) {
      return []
    }
    if (hideCompleted.value) {
      return data.value.items.filter(item => !item.isCompleted)
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
    error.value = null

    try {
      const todoPromise = useFetch<TodoData>('/api/todo', { key: 'todo-list' })
      const connectionsPromise = useFetch<TodoConnection[]>('/api/todo/connections', { key: 'todo-connections' })

      const [{ data: todoData, error: todoError }, { data: connectionsData }] = await Promise.all([
        todoPromise,
        connectionsPromise,
      ])

      if (todoError.value) {
        error.value = todoError.value.data?.message || 'Failed to load todos'
        data.value = null
      }
      else {
        data.value = todoData.value || null
      }

      connections.value = connectionsData.value || []
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load todos'
    }
    finally {
      isLoading.value = false
    }
  }

  const forceRefresh = async () => {
    isLoading.value = true
    error.value = null

    try {
      const [todoData, connectionsData] = await Promise.all([
        $fetch<TodoData>('/api/todo'),
        $fetch<TodoConnection[]>('/api/todo/connections'),
      ])
      data.value = todoData
      connections.value = connectionsData
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load todos'
    }
    finally {
      isLoading.value = false
    }
  }

  const createTodo = async (payload: CreateTodoPayload): Promise<{ id: string } | null> => {
    try {
      const result = await $fetch<{ id: string }>('/api/todo', {
        method: 'POST',
        body: payload,
      })
      await forceRefresh()
      return result
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create todo'
      return null
    }
  }

  const updateTodo = async (id: string, payload: UpdateTodoPayload): Promise<boolean> => {
    try {
      await $fetch(`/api/todo/${id}`, {
        method: 'PUT',
        body: payload,
      })
      await forceRefresh()
      return true
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update todo'
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
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete todo'
      return false
    }
  }

  const toggleTodo = async (id: string): Promise<boolean> => {
    const item = data.value?.items.find(i => i.id === id)
    if (!item) {
      return false
    }

    if (data.value) {
      data.value = {
        items: data.value.items.map(i =>
          i.id === id ? { ...i, isCompleted: !i.isCompleted } : i,
        ),
      }
    }

    try {
      await $fetch(`/api/todo/${id}/toggle`, {
        method: 'PUT',
      })
      return true
    }
    catch (e) {
      if (data.value) {
        data.value = {
          items: data.value.items.map(i =>
            i.id === id ? { ...i, isCompleted: !i.isCompleted } : i,
          ),
        }
      }
      error.value = e instanceof Error ? e.message : 'Failed to toggle todo'
      return false
    }
  }

  const toggleHideCompleted = () => {
    hideCompleted.value = !hideCompleted.value
  }

  const reset = () => {
    data.value = null
    connections.value = []
    error.value = null
    isLoading.value = false
    hideCompleted.value = true
  }

  return {
    data,
    connections,
    error,
    isLoading,
    hideCompleted,
    filteredItems,
    sortedItems,
    overdueCount,
    getTodoById,
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
