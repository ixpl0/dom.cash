import { COOKIE_NAMES, UI_COOKIE_OPTIONS } from '~/utils/cookies'

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

export const usePreferencesStore = defineStore('preferences', () => {
  const cookie = useCookie<UserPreferences>(COOKIE_NAMES.userPreferences, {
    ...UI_COOKIE_OPTIONS,
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
