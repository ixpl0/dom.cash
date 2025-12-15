import { COOKIE_NAMES, UI_COOKIE_OPTIONS } from '~/utils/cookies'

type SortOrder = 'asc' | 'desc'

interface MetricsSort {
  sortBy: string
  sortOrder: SortOrder
}

interface UserPreferences {
  metricsSort: MetricsSort
  todoHideCompleted: boolean
}

const DEFAULT_PREFERENCES: UserPreferences = {
  metricsSort: {
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  todoHideCompleted: true,
}

export const usePreferencesStore = defineStore('preferences', () => {
  const cookie = useCookie<UserPreferences>(COOKIE_NAMES.userPreferences, {
    ...UI_COOKIE_OPTIONS,
    default: () => DEFAULT_PREFERENCES,
  })

  const metricsSort = computed(() => cookie.value.metricsSort)
  const todoHideCompleted = computed(() => cookie.value.todoHideCompleted ?? true)

  const setMetricsSort = (sortBy: string, sortOrder: SortOrder) => {
    cookie.value = {
      ...cookie.value,
      metricsSort: { sortBy, sortOrder },
    }
  }

  const setTodoHideCompleted = (value: boolean) => {
    cookie.value = {
      ...cookie.value,
      todoHideCompleted: value,
    }
  }

  return {
    metricsSort,
    todoHideCompleted,
    setMetricsSort,
    setTodoHideCompleted,
  }
})
