type SortOrder = 'asc' | 'desc'

interface MetricsSort {
  sortBy: string
  sortOrder: SortOrder
}

interface UserPreferences {
  metricsSort: MetricsSort
}

const DEFAULT_PREFERENCES: UserPreferences = {
  metricsSort: {
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
}

const COOKIE_NAME = 'user-preferences'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const usePreferencesStore = defineStore('preferences', () => {
  const cookie = useCookie<UserPreferences>(COOKIE_NAME, {
    maxAge: COOKIE_MAX_AGE,
    default: () => DEFAULT_PREFERENCES,
  })

  const metricsSort = computed(() => cookie.value.metricsSort)

  const setMetricsSort = (sortBy: string, sortOrder: SortOrder) => {
    cookie.value = {
      ...cookie.value,
      metricsSort: { sortBy, sortOrder },
    }
  }

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => {
    cookie.value = {
      ...cookie.value,
      [key]: value,
    }
  }

  const resetPreferences = () => {
    cookie.value = DEFAULT_PREFERENCES
  }

  return {
    metricsSort,
    setMetricsSort,
    updatePreference,
    resetPreferences,
  }
})
