import type { MonthData, PlanData, ComputedMonthData, YearSummary, YearInfo, BudgetData, YearsData } from '~~/shared/types/budget'
import type { BudgetExportData } from '~~/shared/types/export-import'
import { getNextMonth, getPreviousMonth, findClosestMonthForCopy, isPastMonth } from '~~/shared/utils/budget/month-helpers'
import { getEntryConfig, updateMonthWithNewEntry, updateMonthWithUpdatedEntry, updateMonthWithDeletedEntry, findEntryKindByEntryId, monthHasEntry } from '~~/shared/utils/budget/entry-strategies'
import { toMutable } from '~~/shared/utils/shared/immutable'
import { toLocalIsoDate } from '~~/shared/utils/shared/dates'
import { computeMonthData, computeYearSummary, createMonthId, computeExpectedBalances } from '~~/shared/utils/budget/budget-calculations'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import { readServerErrorKey } from '~/utils/server-error'

const PLAN_ONLY_ID_PREFIX = 'plan-only-'

const isPlanOnlyId = (id: string): boolean => id.startsWith(PLAN_ONLY_ID_PREFIX)

const parsePlanOnlyId = (id: string): { year: number, month: number } | null => {
  if (!isPlanOnlyId(id)) {
    return null
  }
  const remainder = id.slice(PLAN_ONLY_ID_PREFIX.length)
  const [yearStr, monthStr] = remainder.split('-')
  if (!yearStr || !monthStr) {
    return null
  }
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return null
  }
  return { year, month }
}

const buildPlanOnlyId = (year: number, month: number): string =>
  `${PLAN_ONLY_ID_PREFIX}${createMonthId(year, month)}`

const createSyntheticPlanMonth = (planRow: PlanData): MonthData => ({
  id: buildPlanOnlyId(planRow.year, planRow.month),
  year: planRow.year,
  month: planRow.month,
  balanceSources: [],
  incomeEntries: [],
  expenseEntries: [],
  exchangeRates: {},
  exchangeRatesSource: '',
  isPlanOnly: true,
})

type RequestFetch = ReturnType<typeof useRequestFetch>

const toLoadError = (err: unknown): { message: string } => ({
  message: readServerErrorKey(err) ?? '',
})

export const useBudgetStore = defineStore('budget', () => {
  const data = ref<BudgetData | null>(null)
  const loadError = ref<{ message: string } | null>(null)
  const canEdit = ref(false)
  const canView = ref(false)
  const availableYears = ref<YearInfo[]>([])
  const loadedYears = ref<Set<number>>(new Set())
  const isLoadingYear = ref(false)
  const isPlanningMode = ref(false)
  const plans = ref<PlanData[]>([])
  const plansLoaded = ref(false)
  const isPlansLoading = ref(false)
  const isStale = ref(false)
  const lastLoadAt = ref<number | null>(null)

  const isOwnBudget = computed(() => data.value?.access === 'owner')
  const { user: currentUser } = useAuthState()
  const { monthNames } = useMonthNames()

  const effectiveMainCurrency = computed(() => data.value?.user?.mainCurrency || currentUser.value?.mainCurrency || 'USD')

  const targetUsernameForApi = computed(() =>
    !isOwnBudget.value && data.value?.user?.username ? data.value.user.username : undefined,
  )

  const ensurePlansLoaded = async (): Promise<void> => {
    if (plansLoaded.value || isPlansLoading.value) {
      return
    }
    isPlansLoading.value = true
    try {
      const targetUsername = targetUsernameForApi.value
      const response = await $fetch<{ plans: PlanData[] }>('/api/budget/plans', {
        query: { username: targetUsername },
      })
      plans.value = toMutable(response.plans || [])
      plansLoaded.value = true
    }
    catch (err) {
      console.error('Error loading plans:', err)
    }
    finally {
      isPlansLoading.value = false
    }
  }

  const togglePlanningMode = async (): Promise<void> => {
    const willEnter = !isPlanningMode.value
    if (willEnter) {
      await ensurePlansLoaded()
    }
    isPlanningMode.value = willEnter
  }

  const setPlanningMode = async (value: boolean): Promise<void> => {
    if (value) {
      await ensurePlansLoaded()
    }
    isPlanningMode.value = value
  }

  const months = computed((): MonthData[] => {
    const realMonths = data.value?.months || []
    if (!isPlanningMode.value) {
      return realMonths
    }
    const realKeys = new Set(realMonths.map(monthItem => createMonthId(monthItem.year, monthItem.month)))
    const syntheticMonths = plans.value
      .filter(planRow => !realKeys.has(createMonthId(planRow.year, planRow.month)))
      .map(createSyntheticPlanMonth)
    const merged = [...realMonths, ...syntheticMonths]
    return merged.sort((a, b) => {
      if (a.year !== b.year) {
        return b.year - a.year
      }
      return b.month - a.month
    })
  })

  const computedMonths = computed((): ComputedMonthData[] => {
    const sourceMonths = months.value
    if (sourceMonths.length === 0) {
      return []
    }

    const planByKey = new Map<string, PlanData>()
    plans.value.forEach((planRow) => {
      planByKey.set(createMonthId(planRow.year, planRow.month), planRow)
    })

    const baseComputed = sourceMonths.map((monthItem) => {
      const key = createMonthId(monthItem.year, monthItem.month)
      const planForMonth = planByKey.get(key) ?? null
      return computeMonthData(
        monthItem,
        sourceMonths,
        effectiveMainCurrency.value,
        monthNames.value,
        planForMonth?.plannedBalanceChange ?? null,
        planForMonth?.comment ?? null,
      )
    })
    return computeExpectedBalances(baseComputed)
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

  const getRollingAverageExpenses = (monthCount: number = 12, minMonths: number = 3): number | null => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const isPastMonth = (year: number, month: number): boolean =>
      year < currentYear || (year === currentYear && month < currentMonth)

    const monthsWithExpenses = computedMonths.value
      .filter(month =>
        month.totalAllExpenses !== null
        && month.totalAllExpenses > 0
        && isPastMonth(month.year, month.month),
      )
      .slice(0, monthCount)

    if (monthsWithExpenses.length < minMonths) {
      return null
    }

    const totalExpenses = monthsWithExpenses.reduce(
      (sum, month) => sum + (month.totalAllExpenses ?? 0),
      0,
    )

    return Math.ceil(totalExpenses / monthsWithExpenses.length)
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

  const $reset = () => {
    data.value = null
    loadError.value = null
    canEdit.value = false
    canView.value = false
    availableYears.value = []
    loadedYears.value = new Set()
    isLoadingYear.value = false
    isPlanningMode.value = false
    plans.value = []
    plansLoaded.value = false
    isPlansLoading.value = false
    isStale.value = false
    lastLoadAt.value = null
  }

  const isShowingBudgetOf = (targetUsername: string | undefined): boolean => {
    if (!data.value) {
      return false
    }
    return targetUsername
      ? data.value.user.username.toLowerCase() === targetUsername.toLowerCase()
      : data.value.access === 'owner'
  }

  const fetchBudget = (requestFetch: RequestFetch, targetUsername: string | undefined, years: readonly number[]) =>
    requestFetch<BudgetData>(targetUsername ? `/api/budget/user/${targetUsername}` : '/api/budget', {
      query: years.length > 0 ? { years: years.join(',') } : undefined,
    })

  const fetchYears = (requestFetch: RequestFetch, targetUsername: string | undefined) =>
    requestFetch<YearsData>('/api/budget/years', { query: { username: targetUsername } })

  const applyBudget = (budgetData: BudgetData, yearsData: YearsData, years: readonly number[]): void => {
    data.value = budgetData
    availableYears.value = yearsData.availableYears
    loadedYears.value = new Set(years)
    canEdit.value = budgetData.access === 'owner' || budgetData.access === 'write'
    canView.value = true
    loadError.value = null
    isStale.value = false
  }

  const loadNewBudget = async (requestFetch: RequestFetch, targetUsername: string | undefined, isLatestLoad: () => boolean): Promise<boolean> => {
    try {
      const [yearsData, budgetData] = await Promise.all([
        fetchYears(requestFetch, targetUsername),
        fetchBudget(requestFetch, targetUsername, []),
      ])
      if (!isLatestLoad()) {
        return false
      }
      $reset()
      applyBudget(budgetData, yearsData, yearsData.initialYears)
      return true
    }
    catch (err) {
      console.error('Error loading budget:', err)
      if (!isLatestLoad()) {
        return false
      }
      $reset()
      loadError.value = toLoadError(err)
      return false
    }
  }

  const refreshShownBudget = async (requestFetch: RequestFetch, targetUsername: string | undefined, isLatestLoad: () => boolean): Promise<boolean> => {
    try {
      const yearsData = await fetchYears(requestFetch, targetUsername)
      const availableYearNumbers = new Set(yearsData.availableYears.map(({ year }) => year))
      const years = [...new Set([...loadedYears.value, ...yearsData.initialYears])]
        .filter(year => availableYearNumbers.has(year))
      const budgetData = await fetchBudget(requestFetch, targetUsername, years)
      if (!isLatestLoad()) {
        return false
      }

      applyBudget(budgetData, yearsData, years)
      plans.value = []
      plansLoaded.value = false
      if (isPlanningMode.value) {
        await ensurePlansLoaded()
      }
      return true
    }
    catch (err) {
      console.error('Error refreshing budget:', err)
      if (isLatestLoad() && readServerErrorKey(err) !== null) {
        $reset()
        loadError.value = toLoadError(err)
      }
      return false
    }
  }

  let latestLoadId = 0

  const load = async (targetUsername?: string): Promise<boolean> => {
    const requestFetch = useRequestFetch()
    latestLoadId += 1
    const loadId = latestLoadId
    const isLatestLoad = (): boolean => loadId === latestLoadId

    const isLoaded = isShowingBudgetOf(targetUsername)
      ? await refreshShownBudget(requestFetch, targetUsername, isLatestLoad)
      : await loadNewBudget(requestFetch, targetUsername, isLatestLoad)
    lastLoadAt.value = Date.now()
    return isLoaded
  }

  const reload = (): Promise<boolean> => {
    if (!data.value) {
      return Promise.resolve(false)
    }
    return load(isOwnBudget.value ? undefined : data.value.user.username)
  }

  const markStale = (): void => {
    if (data.value) {
      isStale.value = true
    }
  }

  const refreshIfStale = async (): Promise<void> => {
    if (!isStale.value) {
      return
    }
    isStale.value = false
    await reload()
  }

  const createMonth = async (year: number, month: number, copyFromMonthId?: string) => {
    if (!data.value) {
      return
    }

    const budgetOwner = data.value.user.username

    try {
      const response = await $fetch<MonthData>('/api/budget/months', {
        method: 'POST',
        body: { year, month, copyFromMonthId, username: targetUsernameForApi.value },
      })

      if (!data.value || data.value.user.username !== budgetOwner) {
        return
      }

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
    const sourceMonths = months.value
    if (!sourceMonths.length) {
      return
    }

    const { year, month } = getNextMonth(sourceMonths)

    if (isPlanningMode.value) {
      if (isPastMonth(year, month)) {
        return
      }
      await upsertPlan(year, month, null)
      return
    }

    const realMonths = data.value?.months || []
    const copyFromId = findClosestMonthForCopy(realMonths, year, month, 'previous')
    await createMonth(year, month, copyFromId || undefined)
  }

  const createPreviousMonth = async () => {
    if (isPlanningMode.value) {
      return
    }
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
      id?: string
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

      const month = currentMonths[monthIndex]
      if (!month) {
        return
      }

      if (monthHasEntry(month, entryKind, response.id)) {
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

  const removeEntryLocally = (entryId: string): void => {
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

  const isEntryNotFoundError = (err: unknown): boolean => readServerErrorKey(err) === ERROR_KEYS.ENTRY_NOT_FOUND

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
      if (isEntryNotFoundError(err)) {
        removeEntryLocally(entryId)
      }
      console.error('Error updating entry:', err)
      throw err
    }
  }

  const deleteEntry = async (entryId: string) => {
    try {
      await $fetch(`/api/budget/entries/${entryId}`, {
        method: 'DELETE',
      })

      removeEntryLocally(entryId)
    }
    catch (err) {
      if (isEntryNotFoundError(err)) {
        removeEntryLocally(entryId)
        return
      }
      console.error('Error deleting entry:', err)
      throw err
    }
  }

  const upsertPlan = async (year: number, month: number, plannedBalanceChange: number | null, comment: string | null = null): Promise<void> => {
    try {
      const response = await $fetch<PlanData>('/api/budget/plans', {
        method: 'PUT',
        body: { year, month, plannedBalanceChange, comment, username: targetUsernameForApi.value },
      })
      const key = createMonthId(year, month)
      const updatedPlans = plans.value.some(planRow => createMonthId(planRow.year, planRow.month) === key)
        ? plans.value.map(planRow =>
            createMonthId(planRow.year, planRow.month) === key
              ? { ...planRow, plannedBalanceChange: response.plannedBalanceChange, comment: response.comment, id: response.id }
              : planRow,
          )
        : [...plans.value, response]
      plans.value = toMutable(updatedPlans)
    }
    catch (err) {
      console.error('Error upserting plan:', err)
      throw err
    }
  }

  const removePlan = async (year: number, month: number): Promise<void> => {
    try {
      await $fetch('/api/budget/plans', {
        method: 'DELETE',
        query: { year, month, username: targetUsernameForApi.value },
      })
      const key = createMonthId(year, month)
      plans.value = toMutable(
        plans.value.filter(planRow => createMonthId(planRow.year, planRow.month) !== key),
      )
    }
    catch (err) {
      console.error('Error deleting plan:', err)
      throw err
    }
  }

  const deleteMonth = async (monthId: string) => {
    const planOnlyTarget = parsePlanOnlyId(monthId)
    if (planOnlyTarget) {
      await removePlan(planOnlyTarget.year, planOnlyTarget.month)
      return
    }

    const target = data.value?.months.find(monthItem => monthItem.id === monthId)

    try {
      await $fetch(`/api/budget/months/${monthId}`, {
        method: 'DELETE',
      })

      if (!data.value) {
        return
      }

      const updatedMonths = data.value.months.filter(monthItem => monthItem.id !== monthId)
      data.value = {
        ...data.value,
        months: toMutable(updatedMonths),
      }

      if (target) {
        plans.value = toMutable(
          plans.value.filter(planRow => !(planRow.year === target.year && planRow.month === target.month)),
        )
      }
    }
    catch (err) {
      console.error('Error deleting month:', err)
      throw err
    }
  }

  const updateCurrency = async (currency: string) => {
    const budgetUsername = data.value?.user.username

    try {
      await $fetch('/api/user/currency', {
        method: 'PUT',
        body: { currency, username: targetUsernameForApi.value },
      })

      if (!data.value || data.value.user.username !== budgetUsername) {
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
    return getNextMonth(months.value)
  }

  const getPreviousMonthData = (): { year: number, month: number } => {
    return getPreviousMonth(data.value?.months || [])
  }

  const fetchBudgetExport = () => $fetch<BudgetExportData>('/api/budget/export', {
    query: { username: targetUsernameForApi.value },
  })

  const exportBudgetJson = async () => {
    try {
      const response = await fetchBudgetExport()

      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `budget-${toLocalIsoDate(new Date())}.json`
      document.body.appendChild(link)
      link.click()

      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
    catch (err) {
      console.error('Error exporting budget to JSON:', err)
      throw err
    }
  }

  const exportBudgetExcel = async () => {
    try {
      const [response, { generateExcelFromBudgetData }] = await Promise.all([
        fetchBudgetExport(),
        import('~~/app/utils/excel-export'),
      ])

      const blob = generateExcelFromBudgetData(response)
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `budget-${toLocalIsoDate(new Date())}.xlsx`
      document.body.appendChild(link)
      link.click()

      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
    catch (err) {
      console.error('Error exporting budget to Excel:', err)
      throw err
    }
  }

  const exportBudget = async (format: 'json' | 'excel' = 'json') => {
    if (format === 'excel') {
      await exportBudgetExcel()
    }
    else {
      await exportBudgetJson()
    }
  }

  const loadYear = async (year: number, targetUsername?: string) => {
    if (isLoadingYear.value || loadedYears.value.has(year)) {
      return
    }

    isLoadingYear.value = true
    const budgetOwner = data.value?.user.username

    try {
      const fetchedData = await $fetch<BudgetData>(
        targetUsername ? `/api/budget/user/${targetUsername}` : '/api/budget',
        { query: { years: year } },
      )

      if (!data.value || data.value.user.username !== budgetOwner) {
        return
      }

      const allMonths = [...data.value.months, ...fetchedData.months].sort((a, b) => {
        if (a.year !== b.year) {
          return b.year - a.year
        }
        return b.month - a.month
      })

      data.value = {
        ...data.value,
        months: allMonths,
      }

      loadedYears.value = new Set([...loadedYears.value, year])
    }
    finally {
      isLoadingYear.value = false
    }
  }

  return {
    data,
    loadError,
    canEdit,
    canView,
    availableYears,
    loadedYears,
    isLoadingYear,
    isPlanningMode,
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
    getRollingAverageExpenses,
    load,
    reload,
    isStale,
    lastLoadAt,
    markStale,
    refreshIfStale,
    loadYear,
    createMonth,
    createNextMonth,
    createPreviousMonth,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteMonth,
    updateCurrency,
    upsertPlan,
    removePlan,
    ensurePlansLoaded,
    plans,
    plansLoaded,
    togglePlanningMode,
    setPlanningMode,
    getNextMonth: getNextMonthData,
    getPreviousMonth: getPreviousMonthData,
    exportBudget,
    $reset,
  }
})
