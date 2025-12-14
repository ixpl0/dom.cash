import type { MemoData, MemoListItem, CreateMemoPayload, UpdateMemoPayload, MemoConnection } from '~~/shared/types/memo'

export const useMemoStore = defineStore('memo', () => {
  const data = ref<MemoData | null>(null)
  const connections = ref<MemoConnection[]>([])
  const error = ref<string | null>(null)
  const isLoading = ref(false)
  const hideCompleted = ref(true)

  const isOverdue = (item: MemoListItem): boolean => {
    if (!item.plannedDate || item.isCompleted) {
      return false
    }
    return new Date(item.plannedDate) <= new Date()
  }

  const filteredItems = computed((): MemoListItem[] => {
    if (!data.value) {
      return []
    }
    if (hideCompleted.value) {
      return data.value.items.filter(item => !item.isCompleted)
    }
    return data.value.items
  })

  const sortedItems = computed((): MemoListItem[] => {
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

  const getMemoById = (id: string): MemoListItem | undefined => {
    return data.value?.items.find(item => item.id === id)
  }

  const refresh = async () => {
    isLoading.value = true
    error.value = null

    try {
      const memoPromise = useFetch<MemoData>('/api/memo', { key: 'memo-list' })
      const connectionsPromise = useFetch<MemoConnection[]>('/api/memo/connections', { key: 'memo-connections' })

      const [{ data: memoData, error: memoError }, { data: connectionsData }] = await Promise.all([
        memoPromise,
        connectionsPromise,
      ])

      if (memoError.value) {
        error.value = memoError.value.data?.message || 'Failed to load memos'
        data.value = null
      }
      else {
        data.value = memoData.value || null
      }

      connections.value = connectionsData.value || []
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load memos'
    }
    finally {
      isLoading.value = false
    }
  }

  const forceRefresh = async () => {
    isLoading.value = true
    error.value = null

    try {
      const [memoData, connectionsData] = await Promise.all([
        $fetch<MemoData>('/api/memo'),
        $fetch<MemoConnection[]>('/api/memo/connections'),
      ])
      data.value = memoData
      connections.value = connectionsData
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load memos'
    }
    finally {
      isLoading.value = false
    }
  }

  const createMemo = async (payload: CreateMemoPayload): Promise<{ id: string } | null> => {
    try {
      const result = await $fetch<{ id: string }>('/api/memo', {
        method: 'POST',
        body: payload,
      })
      await forceRefresh()
      return result
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create memo'
      return null
    }
  }

  const updateMemo = async (id: string, payload: UpdateMemoPayload): Promise<boolean> => {
    try {
      await $fetch(`/api/memo/${id}`, {
        method: 'PUT',
        body: payload,
      })
      await forceRefresh()
      return true
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update memo'
      return false
    }
  }

  const deleteMemo = async (id: string): Promise<boolean> => {
    try {
      await $fetch(`/api/memo/${id}`, {
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
      error.value = e instanceof Error ? e.message : 'Failed to delete memo'
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
      await $fetch(`/api/memo/${id}/toggle`, {
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
    getMemoById,
    refresh,
    forceRefresh,
    createMemo,
    updateMemo,
    deleteMemo,
    toggleTodo,
    toggleHideCompleted,
    reset,
  }
})
