import type { MonthData } from '~~/shared/types/budget'
import { getNextMonth, getPreviousMonth, findClosestMonthForCopy } from '~~/shared/utils/month-helpers'
import { getEntryConfig, updateMonthWithNewEntry, updateMonthWithUpdatedEntry, updateMonthWithDeletedEntry, findEntryKindByEntryId } from '~~/shared/utils/entry-strategies'

const toMutable = <T>(data: T): T => JSON.parse(JSON.stringify(data))

export const useBudgetData = (targetUsername?: string) => {
  const stateKey = targetUsername ? `budget.${targetUsername}.months` : 'budget.months'
  const monthsData = useState<MonthData[]>(stateKey, () => [])

  const loadMonthsData = async (): Promise<void> => {
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const endpoint = targetUsername ? `/api/budget/user/${targetUsername}` : '/api/budget/months'

      if (targetUsername) {
        const userData = await $fetch<{
          user: { username: string, mainCurrency: string }
          access: string
          months: MonthData[]
        }>(endpoint, { headers })
        monthsData.value = toMutable(userData?.months || [])
      }
      else {
        const data = await $fetch<MonthData[]>(endpoint, { headers })
        monthsData.value = toMutable(data || [])
      }
    }
    catch (error) {
      console.error('Error loading budget data:', error)
      monthsData.value = []
    }
  }

  const createMonth = async (year: number, month: number, copyFromMonthId?: string): Promise<void> => {
    try {
      const requestBody = copyFromMonthId
        ? { year, month, copyFromMonthId }
        : { year, month }

      const newMonth = await $fetch<MonthData>('/api/budget/months', {
        method: 'POST',
        body: requestBody,
      })

      if (newMonth) {
        await loadMonthsData()
      }
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

      if (!response) return

      const monthIndex = monthsData.value.findIndex(m => m.id === monthId)
      if (monthIndex === -1) return

      const config = getEntryConfig(entryKind)
      const newEntry = config.createEntry({
        id: response.id ?? '',
        description: response.description ?? '',
        currency: response.currency ?? '',
        amount: response.amount ?? 0,
        date: response.date ?? null,
      })

      monthsData.value = monthsData.value.map((m, index) =>
        index === monthIndex ? updateMonthWithNewEntry(m, entryKind, newEntry) : m,
      )
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

      if (!response) return

      monthsData.value = monthsData.value.map((month) => {
        const entryKind = findEntryKindByEntryId(month, entryId)
        if (!entryKind) return month

        return updateMonthWithUpdatedEntry(month, entryKind, entryId, {
          description: response.description,
          amount: response.amount,
          currency: response.currency,
          date: response.date,
        })
      })
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

      monthsData.value = monthsData.value.map((month) => {
        const entryKind = findEntryKindByEntryId(month, entryId)
        if (!entryKind) return month

        return updateMonthWithDeletedEntry(month, entryKind, entryId)
      })
    }
    catch (error) {
      console.error('Error deleting entry:', error)
      throw error
    }
  }

  const createNextMonth = async (): Promise<void> => {
    const nextMonth = getNextMonth(monthsData.value)
    const copyFromMonthId = findClosestMonthForCopy(monthsData.value, nextMonth.year, nextMonth.month, 'next')
    await createMonth(nextMonth.year, nextMonth.month, copyFromMonthId)
  }

  const createPreviousMonth = async (): Promise<void> => {
    const prevMonth = getPreviousMonth(monthsData.value)
    const copyFromMonthId = findClosestMonthForCopy(monthsData.value, prevMonth.year, prevMonth.month, 'previous')
    await createMonth(prevMonth.year, prevMonth.month, copyFromMonthId)
  }

  return {
    monthsData: computed(() => monthsData.value),
    loadMonthsData,
    createMonth,
    createNextMonth,
    createPreviousMonth,
    getNextMonth: () => getNextMonth(monthsData.value),
    getPreviousMonth: () => getPreviousMonth(monthsData.value),
    addEntry,
    updateEntry,
    deleteEntry,
  }
}
