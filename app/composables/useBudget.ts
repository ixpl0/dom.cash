import type { MonthData } from '~~/shared/types/budget'
import type { BudgetShareAccess } from '~~/server/db/schema'
import { getNextMonth, getPreviousMonth, findClosestMonthForCopy } from '~~/shared/utils/month-helpers'

export interface BudgetData {
  user: {
    username: string
    mainCurrency: string
  }
  access: BudgetShareAccess | 'owner'
  months: MonthData[]
}

export interface BudgetState {
  data: BudgetData | null
  isLoading: boolean
  error: string | null
  canEdit: boolean
  canView: boolean
}

export interface BudgetMethods {
  refresh: () => Promise<void>
  createMonth: (year: number, month: number, copyFromMonthId?: string) => Promise<void>
  createNextMonth: () => Promise<void>
  createPreviousMonth: () => Promise<void>
  addEntry: (
    monthId: string,
    entryKind: 'balance' | 'income' | 'expense',
    entryData: {
      description: string
      amount: number
      currency: string
      date?: string
    }
  ) => Promise<void>
  updateEntry: (
    entryId: string,
    entryData: {
      description: string
      amount: number
      currency: string
      date?: string
    }
  ) => Promise<void>
  deleteEntry: (entryId: string) => Promise<void>
  getNextMonth: () => { year: number, month: number }
  getPreviousMonth: () => { year: number, month: number }
}

export const useBudget = (targetUsername?: string) => {
  const { user: currentUser, loadUserData } = useUser()

  const stateKey = targetUsername ? `budget.${targetUsername}` : 'budget.own'
  const budgetState = useState<BudgetState>(stateKey, () => ({
    data: null,
    isLoading: false,
    error: null,
    canEdit: false,
    canView: false,
  }))

  const isOwnBudget = computed(() => !targetUsername || targetUsername === currentUser.value?.username)

  const loadBudgetData = async (): Promise<void> => {
    budgetState.value.isLoading = true
    budgetState.value.error = null

    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

      if (isOwnBudget.value) {
        if (!currentUser.value) {
          await loadUserData()
        }

        const months = await $fetch<MonthData[]>('/api/budget/months', { headers })
        budgetState.value.data = {
          user: {
            username: currentUser.value?.username || '',
            mainCurrency: currentUser.value?.mainCurrency || 'USD',
          },
          access: 'owner',
          months: months || [],
        }
        budgetState.value.canEdit = true
        budgetState.value.canView = true
      }
      else if (targetUsername) {
        const userData = await $fetch<BudgetData>(`/api/budget/user/${targetUsername}`, { headers })
        budgetState.value.data = userData
        budgetState.value.canEdit = userData.access === 'write' || userData.access === 'owner'
        budgetState.value.canView = true
      }
    }
    catch (error) {
      console.error('Error loading budget data:', error)
      budgetState.value.error = error instanceof Error ? error.message : 'Unknown error'
      budgetState.value.canEdit = false
      budgetState.value.canView = false
    }
    finally {
      budgetState.value.isLoading = false
    }
  }

  const createMonth = async (year: number, month: number, copyFromMonthId?: string): Promise<void> => {
    if (!budgetState.value.canEdit || !isOwnBudget.value) {
      throw new Error('No permission to create months')
    }

    try {
      const requestBody = copyFromMonthId
        ? { year, month, copyFromMonthId }
        : { year, month }

      await $fetch<MonthData>('/api/budget/months', {
        method: 'POST',
        body: requestBody,
      })

      await loadBudgetData()
    }
    catch (error) {
      console.error('Error creating month:', error)
      throw error
    }
  }

  const addEntry = async (
    monthId: string,
    entryKind: 'balance' | 'income' | 'expense',
    entryData: {
      description: string
      amount: number
      currency: string
      date?: string
    },
  ): Promise<void> => {
    if (!budgetState.value.canEdit) {
      throw new Error('No permission to add entries')
    }

    try {
      await $fetch('/api/budget/entries', {
        method: 'POST',
        body: {
          monthId,
          kind: entryKind,
          ...entryData,
        },
      })

      await loadBudgetData()
    }
    catch (error) {
      console.error('Error adding entry:', error)
      throw error
    }
  }

  const updateEntry = async (
    entryId: string,
    entryData: {
      description: string
      amount: number
      currency: string
      date?: string
    },
  ): Promise<void> => {
    if (!budgetState.value.canEdit) {
      throw new Error('No permission to update entries')
    }

    try {
      await $fetch(`/api/budget/entries/${entryId}`, {
        method: 'PUT',
        body: entryData,
      })

      await loadBudgetData()
    }
    catch (error) {
      console.error('Error updating entry:', error)
      throw error
    }
  }

  const deleteEntry = async (entryId: string): Promise<void> => {
    if (!budgetState.value.canEdit) {
      throw new Error('No permission to delete entries')
    }

    try {
      await $fetch(`/api/budget/entries/${entryId}`, {
        method: 'DELETE',
      })

      await loadBudgetData()
    }
    catch (error) {
      console.error('Error deleting entry:', error)
      throw error
    }
  }

  const getNextMonthFromData = (): { year: number, month: number } => {
    const months = budgetState.value.data?.months || []
    return getNextMonth(months)
  }

  const getPreviousMonthFromData = (): { year: number, month: number } => {
    const months = budgetState.value.data?.months || []
    return getPreviousMonth(months)
  }

  const createNextMonth = async (): Promise<void> => {
    const months = budgetState.value.data?.months || []
    const nextMonth = getNextMonth(months)
    const copyFromMonthId = findClosestMonthForCopy(months, nextMonth.year, nextMonth.month, 'next')
    await createMonth(nextMonth.year, nextMonth.month, copyFromMonthId)
  }

  const createPreviousMonth = async (): Promise<void> => {
    const months = budgetState.value.data?.months || []
    const prevMonth = getPreviousMonth(months)
    const copyFromMonthId = findClosestMonthForCopy(months, prevMonth.year, prevMonth.month, 'previous')
    await createMonth(prevMonth.year, prevMonth.month, copyFromMonthId)
  }

  const methods: BudgetMethods = {
    refresh: loadBudgetData,
    createMonth,
    createNextMonth,
    createPreviousMonth,
    addEntry,
    updateEntry,
    deleteEntry,
    getNextMonth: getNextMonthFromData,
    getPreviousMonth: getPreviousMonthFromData,
  }

  return {
    data: computed(() => budgetState.value.data),
    isLoading: computed(() => budgetState.value.isLoading),
    error: computed(() => budgetState.value.error),
    canEdit: computed(() => budgetState.value.canEdit),
    canView: computed(() => budgetState.value.canView),
    ...methods,
  }
}
