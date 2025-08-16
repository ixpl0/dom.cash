import type { MonthData } from '~~/shared/types/budget'
import type { BudgetShareAccess } from '~~/server/db/schema'
import { getNextMonth, getPreviousMonth, findClosestMonthForCopy } from '~~/shared/utils/month-helpers'
import { getEntryConfig, updateMonthWithNewEntry, updateMonthWithUpdatedEntry, updateMonthWithDeletedEntry, findEntryKindByEntryId } from '~~/shared/utils/entry-strategies'

const toMutable = <T>(data: T): T => JSON.parse(JSON.stringify(data))

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
  updateCurrency: (currency: string) => Promise<void>
  getNextMonth: () => { year: number, month: number }
  getPreviousMonth: () => { year: number, month: number }
}

export const useBudget = (targetUsername?: string) => {
  const { user: currentUser } = useUser()

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
        const [userData, months] = await Promise.all([
          $fetch<{ id: string, username: string, mainCurrency: string }>('/api/auth/me', { headers }),
          $fetch<MonthData[]>('/api/budget/months', { headers }),
        ])

        budgetState.value.data = {
          user: {
            username: userData.username,
            mainCurrency: userData.mainCurrency,
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
    if (!budgetState.value.canEdit) {
      throw new Error('No permission to create months')
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

      if (!isOwnBudget.value && budgetState.value.data?.user.username) {
        requestBody.targetUsername = budgetState.value.data.user.username
      }

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
    try {
      const response = await $fetch<{
        id: string
        description: string
        amount: number
        currency: string
        date?: string | null
      }>('/api/budget/entries', {
        method: 'POST',
        body: {
          monthId,
          kind: entryKind,
          ...entryData,
        },
      })

      if (!response || !budgetState.value.data) return

      const months = budgetState.value.data.months
      const monthIndex = months.findIndex(m => m.id === monthId)
      if (monthIndex === -1) return

      const config = getEntryConfig(entryKind)
      const newEntry = config.createEntry({
        id: response.id ?? '',
        description: response.description ?? '',
        currency: response.currency ?? '',
        amount: response.amount ?? 0,
        date: response.date ?? null,
      })

      const updatedMonths = months.map((m, index) =>
        index === monthIndex ? updateMonthWithNewEntry(m, entryKind, newEntry) : m,
      )

      budgetState.value.data = {
        ...budgetState.value.data,
        months: toMutable(updatedMonths),
      }
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
    try {
      const response = await $fetch<{
        id: string
        description: string
        amount: number
        currency: string
        date?: string | null
      }>(`/api/budget/entries/${entryId}`, {
        method: 'PUT',
        body: entryData,
      })

      if (!response || !budgetState.value.data) return

      const months = budgetState.value.data.months
      const updatedMonths = months.map((month) => {
        const entryKind = findEntryKindByEntryId(month, entryId)
        if (!entryKind) return month

        return updateMonthWithUpdatedEntry(month, entryKind, entryId, {
          description: response.description,
          amount: response.amount,
          currency: response.currency,
          date: response.date,
        })
      })

      budgetState.value.data = {
        ...budgetState.value.data,
        months: toMutable(updatedMonths),
      }
    }
    catch (error) {
      console.error('Error updating entry:', error)
      throw error
    }
  }

  const deleteEntry = async (entryId: string): Promise<void> => {
    try {
      await $fetch(`/api/budget/entries/${entryId}`, {
        method: 'DELETE',
      })

      if (!budgetState.value.data) return

      const months = budgetState.value.data.months
      const updatedMonths = months.map((month) => {
        const entryKind = findEntryKindByEntryId(month, entryId)
        if (!entryKind) return month

        return updateMonthWithDeletedEntry(month, entryKind, entryId)
      })

      budgetState.value.data = {
        ...budgetState.value.data,
        months: toMutable(updatedMonths),
      }
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

  const updateCurrency = async (currency: string): Promise<void> => {
    if (!budgetState.value.canEdit || !budgetState.value.data) {
      throw new Error('No permission to update currency')
    }

    const oldCurrency = budgetState.value.data.user.mainCurrency

    budgetState.value.data = {
      ...budgetState.value.data,
      user: {
        ...budgetState.value.data.user,
        mainCurrency: currency,
      },
    }

    try {
      await $fetch('/api/user/currency', {
        method: 'PUT',
        body: {
          currency,
          targetUsername: targetUsername,
        },
      })
    }
    catch (error) {
      budgetState.value.data = {
        ...budgetState.value.data,
        user: {
          ...budgetState.value.data.user,
          mainCurrency: oldCurrency,
        },
      }
      console.error('Error updating currency:', error)
      throw error
    }
  }

  const methods: BudgetMethods = {
    refresh: loadBudgetData,
    createMonth,
    createNextMonth,
    createPreviousMonth,
    addEntry,
    updateEntry,
    deleteEntry,
    updateCurrency,
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
