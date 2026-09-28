import type { MonthData, PlanData, ComputedMonthData, YearSummary, YearInfo, BudgetData, YearsData, EntryPayload, SavedEntry } from '~~/shared/types/budget'
import type { EntryKind } from '~~/shared/types'
import { getNextMonth, getPreviousMonth, findClosestMonthForCopy, isPastMonth, sortMonthsNewestFirst } from '~~/shared/utils/budget/month-helpers'
import { getEntryConfig, updateMonthWithNewEntry, updateMonthWithUpdatedEntry, updateMonthWithDeletedEntry, findEntryKindByEntryId, monthHasEntry } from '~~/shared/utils/budget/entry-strategies'
import { computeMonthData, computeYearSummary, createMonthKey, computeExpectedBalances } from '~~/shared/utils/budget/budget-calculations'
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
  `${PLAN_ONLY_ID_PREFIX}${createMonthKey(year, month)}`

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

interface EntryLocation {
  month: MonthData
  kind: EntryKind
}

type RequestFetch = ReturnType<typeof useRequestFetch>

const toLoadError = (err: unknown): { message: string } => ({
  message: readServerErrorKey(err) ?? '',
})

const isEntryNotFoundError = (err: unknown): boolean => readServerErrorKey(err) === ERROR_KEYS.ENTRY_NOT_FOUND

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
      const response = await $fetch<{ plans: PlanData[] }>('/api/budget/plans', {
        query: { username: targetUsernameForApi.value },
      })
      plans.value = response.plans
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

  const months = computed((): MonthData[] => {
    const realMonths = data.value?.months || []
    if (!isPlanningMode.value) {
      return realMonths
    }
    const realKeys = new Set(realMonths.map(monthItem => createMonthKey(monthItem.year, monthItem.month)))
    const syntheticMonths = plans.value
      .filter(planRow => !realKeys.has(createMonthKey(planRow.year, planRow.month)))
      .map(createSyntheticPlanMonth)
    return sortMonthsNewestFirst([...realMonths, ...syntheticMonths])
  })

  const computedMonths = computed((): ComputedMonthData[] => {
    const sourceMonths = months.value
    if (sourceMonths.length === 0) {
      return []
    }

    const planByKey = new Map(plans.value.map(planRow => [createMonthKey(planRow.year, planRow.month), planRow]))

    const baseComputed = sourceMonths.map((monthItem) => {
      const planForMonth = planByKey.get(createMonthKey(monthItem.year, monthItem.month)) ?? null
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

  const getComputedMonthByKey = (monthKey: string): ComputedMonthData | undefined => {
    return computedMonths.value.find(month => month.monthKey === monthKey)
  }

  const yearsSummary = computed((): YearSummary[] => {
    const years = [...new Set(computedMonths.value.map(m => m.year))].sort((a, b) => b - a)
    return years.map(year => computeYearSummary(year, computedMonths.value))
  })

  const getYearSummary = (year: number): YearSummary | undefined => {
    return yearsSummary.value.find(y => y.year === year)
  }

  const getRollingAverageExpenses = (monthCount: number = 12, minMonths: number = 3): number | null => {
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

  const nextYearToLoad = computed((): YearInfo | null => {
    if (availableYears.value.length === 0) {
      return null
    }
    if (loadedYears.value.size === 0) {
      return availableYears.value[0] ?? null
    }

    const oldestLoadedYear = Math.min(...loadedYears.value)
    return availableYears.value.find(({ year }) => year < oldestLoadedYear) ?? null
  })

  const getEntriesByMonthAndKind = (monthId: string, entryKind: EntryKind) => {
    const month = data.value?.months.find(m => m.id === monthId)
    if (!month) {
      return []
    }

    switch (entryKind) {
      case 'balance':
        return month.balanceSources
      case 'income':
        return month.incomeEntries
      case 'expense':
        return month.expenseEntries
      default:
        return []
    }
  }

  const resetState = (): void => {
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
      resetState()
      applyBudget(budgetData, yearsData, yearsData.initialYears)
      return true
    }
    catch (err) {
      console.error('Error loading budget:', err)
      if (!isLatestLoad()) {
        return false
      }
      resetState()
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
        resetState()
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
    await load(targetUsernameForApi.value)
  }

  const loadYear = async (year: number): Promise<void> => {
    if (isLoadingYear.value || loadedYears.value.has(year)) {
      return
    }

    const requestFetch = useRequestFetch()
    const budgetOwner = data.value?.user.username
    isLoadingYear.value = true

    try {
      const yearData = await fetchBudget(requestFetch, targetUsernameForApi.value, [year])

      if (!data.value || data.value.user.username !== budgetOwner) {
        return
      }

      data.value = { ...data.value, months: sortMonthsNewestFirst([...data.value.months, ...yearData.months]) }
      loadedYears.value = new Set([...loadedYears.value, year])
    }
    finally {
      isLoadingYear.value = false
    }
  }

  const replaceMonth = (updatedMonth: MonthData): void => {
    if (data.value) {
      data.value = {
        ...data.value,
        months: data.value.months.map(month => month.id === updatedMonth.id ? updatedMonth : month),
      }
    }
  }

  const findEntryLocation = (entryId: string): EntryLocation | null => {
    const month = data.value?.months.find(monthItem => findEntryKindByEntryId(monthItem, entryId) !== null)
    const kind = month ? findEntryKindByEntryId(month, entryId) : null
    return month && kind ? { month, kind } : null
  }

  const removeEntryLocally = (entryId: string): void => {
    const location = findEntryLocation(entryId)
    if (location) {
      replaceMonth(updateMonthWithDeletedEntry(location.month, location.kind, entryId))
    }
  }

  const createMonth = async (year: number, month: number, copyFromMonthId?: string): Promise<void> => {
    if (!data.value) {
      return
    }

    const budgetOwner = data.value.user.username
    const createdMonth = await $fetch<MonthData>('/api/budget/months', {
      method: 'POST',
      body: { year, month, copyFromMonthId, username: targetUsernameForApi.value },
    })

    if (!data.value || data.value.user.username !== budgetOwner) {
      return
    }

    data.value = { ...data.value, months: sortMonthsNewestFirst([...data.value.months, createdMonth]) }
  }

  const createNextMonth = async (): Promise<void> => {
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

    const copyFromId = findClosestMonthForCopy(data.value?.months || [], year, month, 'previous')
    await createMonth(year, month, copyFromId)
  }

  const createPreviousMonth = async (): Promise<void> => {
    if (isPlanningMode.value || !data.value?.months.length) {
      return
    }

    const { year, month } = getPreviousMonth(data.value.months)
    const copyFromId = findClosestMonthForCopy(data.value.months, year, month, 'next')

    await createMonth(year, month, copyFromId)
  }

  const addEntry = async (monthId: string, entryKind: EntryKind, entryData: EntryPayload & { id?: string }): Promise<void> => {
    const savedEntry = await $fetch<SavedEntry>('/api/budget/entries', {
      method: 'POST',
      body: { monthId, kind: entryKind, ...entryData },
    })

    const month = data.value?.months.find(monthItem => monthItem.id === monthId)
    if (!month || monthHasEntry(month, entryKind, savedEntry.id)) {
      return
    }

    replaceMonth(updateMonthWithNewEntry(month, entryKind, getEntryConfig(entryKind).createEntry(savedEntry)))
  }

  const updateEntry = async (entryId: string, entryData: EntryPayload): Promise<void> => {
    try {
      const savedEntry = await $fetch<SavedEntry>(`/api/budget/entries/${entryId}`, {
        method: 'PUT',
        body: entryData,
      })

      const location = findEntryLocation(entryId)
      if (location) {
        replaceMonth(updateMonthWithUpdatedEntry(location.month, location.kind, savedEntry.id, savedEntry))
      }
    }
    catch (err) {
      if (isEntryNotFoundError(err)) {
        removeEntryLocally(entryId)
      }
      throw err
    }
  }

  const deleteEntry = async (entryId: string): Promise<void> => {
    try {
      await $fetch(`/api/budget/entries/${entryId}`, {
        method: 'DELETE',
      })
    }
    catch (err) {
      if (!isEntryNotFoundError(err)) {
        throw err
      }
    }

    removeEntryLocally(entryId)
  }

  const isPlanForMonth = (year: number, month: number) => (planRow: PlanData): boolean =>
    planRow.year === year && planRow.month === month

  const upsertPlan = async (year: number, month: number, plannedBalanceChange: number | null, comment: string | null = null): Promise<void> => {
    const savedPlan = await $fetch<PlanData>('/api/budget/plans', {
      method: 'PUT',
      body: { year, month, plannedBalanceChange, comment, username: targetUsernameForApi.value },
    })

    const isSavedMonth = isPlanForMonth(year, month)
    plans.value = plans.value.some(isSavedMonth)
      ? plans.value.map(planRow => isSavedMonth(planRow) ? savedPlan : planRow)
      : [...plans.value, savedPlan]
  }

  const removePlan = async (year: number, month: number): Promise<void> => {
    await $fetch('/api/budget/plans', {
      method: 'DELETE',
      query: { year, month, username: targetUsernameForApi.value },
    })

    const isRemovedMonth = isPlanForMonth(year, month)
    plans.value = plans.value.filter(planRow => !isRemovedMonth(planRow))
  }

  const deleteMonth = async (monthId: string): Promise<void> => {
    const planOnlyTarget = parsePlanOnlyId(monthId)
    if (planOnlyTarget) {
      await removePlan(planOnlyTarget.year, planOnlyTarget.month)
      return
    }

    const target = data.value?.months.find(monthItem => monthItem.id === monthId)

    await $fetch(`/api/budget/months/${monthId}`, {
      method: 'DELETE',
    })

    if (!data.value) {
      return
    }

    data.value = { ...data.value, months: data.value.months.filter(monthItem => monthItem.id !== monthId) }

    if (target) {
      const isDeletedMonth = isPlanForMonth(target.year, target.month)
      plans.value = plans.value.filter(planRow => !isDeletedMonth(planRow))
    }
  }

  const updateCurrency = async (currency: string): Promise<void> => {
    const budgetUsername = data.value?.user.username

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

  const getNextMonthData = (): { year: number, month: number } => {
    return getNextMonth(months.value)
  }

  const getPreviousMonthData = (): { year: number, month: number } => {
    return getPreviousMonth(data.value?.months || [])
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
    plans,
    plansLoaded,
    isStale,
    lastLoadAt,
    nextYearToLoad,
    isOwnBudget,
    targetUsernameForApi,
    months,
    computedMonths,
    monthNames,
    effectiveMainCurrency,
    getEntriesByMonthAndKind,
    getComputedMonthByKey,
    getYearSummary,
    getRollingAverageExpenses,
    load,
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
    togglePlanningMode,
    getNextMonth: getNextMonthData,
    getPreviousMonth: getPreviousMonthData,
  }
})
