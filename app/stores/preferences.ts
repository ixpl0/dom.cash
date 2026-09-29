import { DOC_DEFAULT_RECOGNITION_EFFORT, docRecognitionEffortSchema } from '~~/shared/schemas/docs'
import type { DocRecognitionEffort } from '~~/shared/types/docs'
import { COOKIE_NAMES, UI_COOKIE_OPTIONS } from '~/utils/cookies'

type SortOrder = 'asc' | 'desc'

interface MetricsSort {
  sortBy: string
  sortOrder: SortOrder
}

interface UserPreferences {
  metricsSort: MetricsSort
  todoHideCompleted: boolean
  docsRecognitionEffort: DocRecognitionEffort
}

const DEFAULT_PREFERENCES: UserPreferences = {
  metricsSort: {
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  todoHideCompleted: true,
  docsRecognitionEffort: DOC_DEFAULT_RECOGNITION_EFFORT,
}

export const usePreferencesStore = defineStore('preferences', () => {
  const cookie = useCookie<UserPreferences>(COOKIE_NAMES.userPreferences, {
    ...UI_COOKIE_OPTIONS,
    default: () => DEFAULT_PREFERENCES,
  })

  const metricsSort = computed(() => cookie.value.metricsSort)
  const todoHideCompleted = computed(() => cookie.value.todoHideCompleted ?? true)
  const docsRecognitionEffort = computed((): DocRecognitionEffort =>
    docRecognitionEffortSchema.safeParse(cookie.value.docsRecognitionEffort).data ?? DOC_DEFAULT_RECOGNITION_EFFORT)

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

  const setDocsRecognitionEffort = (value: DocRecognitionEffort) => {
    cookie.value = {
      ...cookie.value,
      docsRecognitionEffort: value,
    }
  }

  return {
    metricsSort,
    todoHideCompleted,
    docsRecognitionEffort,
    setMetricsSort,
    setTodoHideCompleted,
    setDocsRecognitionEffort,
  }
})
