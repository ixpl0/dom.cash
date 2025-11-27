import type { MonthData, ComputedMonthData, YearSummary } from '~~/shared/types/budget'
import type { BudgetShareAccess } from '~~/server/db/schema'
import { getNextMonth, getPreviousMonth, findClosestMonthForCopy } from '~~/shared/utils/month-helpers'
import { getEntryConfig, updateMonthWithNewEntry, updateMonthWithUpdatedEntry, updateMonthWithDeletedEntry, findEntryKindByEntryId } from '~~/shared/utils/entry-strategies'
import { toMutable } from '~~/shared/utils/immutable'
import { computeMonthData, computeYearSummary, createMonthId } from '~~/shared/utils/budget-calculations'

export interface YearInfo {
  year: number
  monthCount: number
  months: number[]
}

export interface YearsData {
  availableYears: YearInfo[]
  initialYears: number[]
}

export interface BudgetData {
  user: {
    id: string
    username: string
    mainCurrency: string
  }
  access: BudgetShareAccess | 'owner'
  months: MonthData[]
}

export interface BudgetState {
  data: BudgetData | null
  error: string | null
  canEdit: boolean
  canView: boolean
  availableYears: YearInfo[]
  loadedYears: Set<number>
  isLoadingYear: boolean
}

export const useBudgetStore = defineStore('budget', () => {
  const data = ref<BudgetData | null>(null)
  const error = ref<string | null>(null)
  const canEdit = ref(false)
  const canView = ref(false)
  const availableYears = ref<YearInfo[]>([])
  const loadedYears = ref<Set<number>>(new Set())
  const isLoadingYear = ref(false)

  const isOwnBudget = computed(() => data.value?.access === 'owner')
  const months = computed(() => data.value?.months || [])
  const { mainCurrency } = useUser()
  const { monthNames } = useMonthNames()

  const effectiveMainCurrency = computed(() => data.value?.user?.mainCurrency || mainCurrency.value)

  const computedMonths = computed((): ComputedMonthData[] => {
    if (!data.value?.months) {
      return []
    }

    return data.value.months.map(month =>
      computeMonthData(month, data.value!.months, effectiveMainCurrency.value, monthNames.value),
    )
  })

  const getComputedMonthById = (monthId: string): ComputedMonthData | undefined => {
    return computedMonths.value.find(month => month.monthId === monthId)
  }

  const getComputedMonthByYearMonth = (year: number, month: number): ComputedMonthData | undefined => {
    const monthId = createMonthId(year, month)
    return getComputedMonthById(monthId)
  }

  const yearsSummary = computed((): YearSummary[] => {
    const years = [...new Set(computedMonths.value.map(m => m.year))].sort((a, b) => b - a)
    return years.map(year => computeYearSummary(year, computedMonths.value))
  })

  const getYearSummary = (year: number): YearSummary | undefined => {
    return yearsSummary.value.find(y => y.year === year)
  }

  const nextYearToLoad = computed(() => {
    if (availableYears.value.length === 0) {
      return null
    }

    const loadedYearsArray = Array.from(loadedYears.value).sort((a, b) => b - a)
    if (loadedYearsArray.length === 0) {
      return availableYears.value[0] || null
    }

    const oldestLoadedYear = loadedYearsArray[loadedYearsArray.length - 1]
    if (oldestLoadedYear === undefined) {
      return null
    }

    const nextYear = availableYears.value.find(y => y.year < oldestLoadedYear)

    return nextYear || null
  })

  const getMonthById = (monthId: string): MonthData | undefined => {
    return data.value?.months.find(month => month.id === monthId)
  }

  const getEntriesByMonthAndKind = (monthId: string, entryKind: 'balance' | 'income' | 'expense') => {
    const month = data.value?.months.find(m => m.id === monthId)
    if (!month) {
      return []
    }

    switch (entryKind) {
      case 'balance':
        return month.balanceSources || []
      case 'income':
        return month.incomeEntries || []
      case 'expense':
        return month.expenseEntries || []
      default:
        return []
    }
  }

  const refresh = async (targetUsername?: string) => {
    error.value = null

    try {
      const yearsPromise = useFetch<YearsData>(
        targetUsername ? `/api/budget/years?username=${targetUsername}` : '/api/budget/years',
        {
          key: targetUsername ? `budget-years-${targetUsername}` : 'budget-years-own',
        },
      )

      const { data: fetchedData, error: fetchError } = await useFetch<BudgetData>(
        targetUsername ? `/api/budget/user/${targetUsername}` : '/api/budget',
        {
          key: targetUsername ? `budget-user-${targetUsername}` : 'budget-own',
        },
      )

      const { data: yearsData } = await yearsPromise

      if (fetchError.value) {
        error.value = fetchError.value.data?.message || 'Failed to load budget'
        data.value = null
      }
      else {
        data.value = fetchedData.value || null
      }

      if (yearsData.value) {
        availableYears.value = yearsData.value.availableYears
        loadedYears.value = new Set(yearsData.value.initialYears)
      }

      if (data.value) {
        canEdit.value = data.value.access === 'owner' || data.value.access === 'write'
        canView.value = true
      }
    }
    catch (err) {
      console.error('Error refreshing budget:', err)
      error.value = 'Failed to load budget'
    }
  }

  const forceRefresh = async (targetUsername?: string) => {
    error.value = null

    try {
      const [yearsData, fetchedData] = await Promise.all([
        $fetch<YearsData>(
          targetUsername ? `/api/budget/years?username=${targetUsername}` : '/api/budget/years',
        ),
        $fetch<BudgetData>(
          targetUsername ? `/api/budget/user/${targetUsername}` : '/api/budget',
        ),
      ])

      data.value = fetchedData || null

      if (yearsData) {
        availableYears.value = yearsData.availableYears
        loadedYears.value = new Set(yearsData.initialYears)
      }

      if (data.value) {
        canEdit.value = data.value.access === 'owner' || data.value.access === 'write'
        canView.value = true
      }
    }
    catch (err) {
      console.error('Error force refreshing budget:', err)
      error.value = 'Failed to load budget'
      data.value = null
    }
  }

  const createMonth = async (year: number, month: number, copyFromMonthId?: string) => {
    if (!data.value) {
      return
    }

    try {
      const requestBody: {
        year: number
        month: number
        copyFromMonthId?: string
        targetUsername?: string
      } = { year, month }

      if (copyFromMonthId) {
        requestBody.copyFromMonthId = copyFromMonthId
      }

      if (data.value.user.username) {
        requestBody.targetUsername = data.value.user.username
      }

      const response = await $fetch<MonthData>('/api/budget/months', {
        method: 'POST',
        body: requestBody,
      })

      const updatedMonths = [...data.value.months, response].sort((a, b) => {
        if (a.year !== b.year) {
          return b.year - a.year
        }
        return b.month - a.month
      })

      data.value = {
        ...data.value,
        months: toMutable(updatedMonths),
      }
    }
    catch (err) {
      console.error('Error creating month:', err)
      throw err
    }
  }

  const createNextMonth = async () => {
    if (!data.value?.months.length) {
      return
    }

    const { year, month } = getNextMonth(data.value.months)
    const copyFromId = findClosestMonthForCopy(data.value.months, year, month, 'previous')

    await createMonth(year, month, copyFromId || undefined)
  }

  const createPreviousMonth = async () => {
    if (!data.value?.months.length) {
      return
    }

    const { year, month } = getPreviousMonth(data.value.months)
    const copyFromId = findClosestMonthForCopy(data.value.months, year, month, 'next')

    await createMonth(year, month, copyFromId || undefined)
  }

  const addEntry = async (
    monthId: string,
    entryKind: 'balance' | 'income' | 'expense',
    entryData: {
      description: string
      amount: number
      currency: string
      date?: string
      isOptional?: boolean
    },
  ) => {
    try {
      const response = await $fetch<{
        id: string
        description: string
        amount: number
        currency: string
        date?: string | null
        isOptional?: boolean
      }>('/api/budget/entries', {
        method: 'POST',
        body: {
          monthId,
          kind: entryKind,
          ...entryData,
        },
      })

      if (!response || !data.value) {
        return
      }

      const currentMonths = data.value.months
      const monthIndex = currentMonths.findIndex(m => m.id === monthId)
      if (monthIndex === -1) {
        return
      }

      const config = getEntryConfig(entryKind)
      const newEntry = config.createEntry({
        id: response.id,
        description: response.description,
        amount: response.amount,
        currency: response.currency,
        date: response.date ?? undefined,
        isOptional: response.isOptional,
      })

      const month = currentMonths[monthIndex]
      if (!month) {
        return
      }

      const updatedMonth = updateMonthWithNewEntry(month, entryKind, newEntry) as MonthData
      const updatedMonths = [...currentMonths]
      updatedMonths[monthIndex] = updatedMonth

      data.value = {
        ...data.value,
        months: toMutable(updatedMonths),
      }
    }
    catch (err) {
      console.error('Error adding entry:', err)
      throw err
    }
  }

  const updateEntry = async (
    entryId: string,
    entryData: {
      description: string
      amount: number
      currency: string
      date?: string
      isOptional?: boolean
    },
  ) => {
    try {
      const response = await $fetch<{
        id: string
        description: string
        amount: number
        currency: string
        date?: string | null
        isOptional?: boolean
      }>(`/api/budget/entries/${entryId}`, {
        method: 'PUT',
        body: entryData,
      })

      if (!response || !data.value) {
        return
      }

      const currentMonths = data.value.months
      let entryKindResult: { month: MonthData, kind: 'balance' | 'income' | 'expense' } | null = null

      for (const month of currentMonths) {
        const entryKind = findEntryKindByEntryId(month, entryId)
        if (entryKind) {
          entryKindResult = { month, kind: entryKind }
          break
        }
      }

      if (!entryKindResult) {
        return
      }

      const updatedMonth = updateMonthWithUpdatedEntry(
        entryKindResult.month,
        entryKindResult.kind,
        response.id,
        {
          description: response.description,
          amount: response.amount,
          currency: response.currency,
          date: response.date ?? undefined,
          isOptional: response.isOptional,
        },
      ) as MonthData

      const monthIndex = currentMonths.findIndex(m => m.id === entryKindResult.month.id)
      if (monthIndex === -1) {
        return
      }

      const updatedMonths = [...currentMonths]
      updatedMonths[monthIndex] = updatedMonth

      data.value = {
        ...data.value,
        months: toMutable(updatedMonths),
      }
    }
    catch (err) {
      console.error('Error updating entry:', err)
      throw err
    }
  }

  const deleteEntry = async (entryId: string) => {
    try {
      await $fetch(`/api/budget/entries/${entryId}`, {
        method: 'DELETE',
      })

      if (!data.value) {
        return
      }

      const currentMonths = data.value.months
      let entryKindResult: { month: MonthData, kind: 'balance' | 'income' | 'expense' } | null = null

      for (const month of currentMonths) {
        const entryKind = findEntryKindByEntryId(month, entryId)
        if (entryKind) {
          entryKindResult = { month, kind: entryKind }
          break
        }
      }

      if (!entryKindResult) {
        return
      }

      const updatedMonth = updateMonthWithDeletedEntry(entryKindResult.month, entryKindResult.kind, entryId) as MonthData
      const monthIndex = currentMonths.findIndex(m => m.id === entryKindResult.month.id)
      if (monthIndex === -1) {
        return
      }

      const updatedMonths = [...currentMonths]
      updatedMonths[monthIndex] = updatedMonth

      data.value = {
        ...data.value,
        months: toMutable(updatedMonths),
      }
    }
    catch (err) {
      console.error('Error deleting entry:', err)
      throw err
    }
  }

  const deleteMonth = async (monthId: string) => {
    try {
      await $fetch(`/api/budget/months/${monthId}`, {
        method: 'DELETE',
      })

      if (!data.value) {
        return
      }

      const updatedMonths = data.value.months.filter(month => month.id !== monthId)
      data.value = {
        ...data.value,
        months: toMutable(updatedMonths),
      }
    }
    catch (err) {
      console.error('Error deleting month:', err)
      throw err
    }
  }

  const updateCurrency = async (currency: string) => {
    try {
      await $fetch('/api/user/currency', {
        method: 'PUT',
        body: { currency },
      })

      if (!data.value) {
        return
      }

      data.value = {
        ...data.value,
        user: {
          ...data.value.user,
          mainCurrency: currency,
        },
      }
    }
    catch (err) {
      console.error('Error updating currency:', err)
      throw err
    }
  }

  const getNextMonthData = (): { year: number, month: number } => {
    return getNextMonth(data.value?.months || [])
  }

  const getPreviousMonthData = (): { year: number, month: number } => {
    return getPreviousMonth(data.value?.months || [])
  }

  const exportBudget = async () => {
    try {
      const response = await $fetch('/api/budget/export', {
        method: 'GET',
      })

      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `budget-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()

      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
    catch (err) {
      console.error('Error exporting budget:', err)
      throw err
    }
  }

  const loadYear = async (year: number, targetUsername?: string) => {
    if (isLoadingYear.value || loadedYears.value.has(year)) {
      return
    }

    isLoadingYear.value = true
    error.value = null

    try {
      const { data: fetchedData, error: fetchError } = await useFetch<BudgetData>(
        targetUsername
          ? `/api/budget/user/${targetUsername}?years=${year}`
          : `/api/budget?years=${year}`,
        {
          key: `budget-year-${year}-${targetUsername || 'own'}`,
        },
      )

      if (fetchError.value) {
        error.value = fetchError.value.data?.message || 'Failed to load year data'
        return
      }

      if (fetchedData.value && data.value) {
        const existingMonths = data.value.months
        const newMonths = fetchedData.value.months

        const allMonths = [...existingMonths, ...newMonths].sort((a, b) => {
          if (a.year !== b.year) {
            return b.year - a.year
          }
          return b.month - a.month
        })

        data.value = {
          ...data.value,
          months: toMutable(allMonths),
        }

        loadedYears.value.add(year)
      }
    }
    catch (err) {
      console.error('Error loading year:', err)
      error.value = 'Failed to load year'
    }
    finally {
      isLoadingYear.value = false
    }
  }

  const $reset = () => {
    data.value = null
    error.value = null
    canEdit.value = false
    canView.value = false
    availableYears.value = []
    loadedYears.value = new Set()
    isLoadingYear.value = false
  }

  return {
    data,
    error,
    canEdit,
    canView,
    availableYears,
    loadedYears,
    isLoadingYear,
    nextYearToLoad,
    isOwnBudget,
    months,
    computedMonths,
    monthNames,
    effectiveMainCurrency,
    yearsSummary,
    getMonthById,
    getEntriesByMonthAndKind,
    getComputedMonthById,
    getComputedMonthByYearMonth,
    getYearSummary,
    refresh,
    forceRefresh,
    loadYear,
    createMonth,
    createNextMonth,
    createPreviousMonth,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteMonth,
    updateCurrency,
    getNextMonth: getNextMonthData,
    getPreviousMonth: getPreviousMonthData,
    exportBudget,
    $reset,
  }
})
