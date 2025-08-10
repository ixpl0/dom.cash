import type { MonthData, BalanceSourceData, IncomeEntryData, ExpenseEntryData } from '~~/shared/types/budget'

const toMutable = <T>(data: T): T => JSON.parse(JSON.stringify(data))

export const useBudgetData = () => {
  const monthsData = useState<MonthData[]>('budget.months', () => [])

  const loadMonthsData = async (): Promise<void> => {
    try {
      const data = await $fetch<MonthData[]>('/api/budget/months')
      monthsData.value = toMutable(data || [])
    }
    catch (error) {
      console.error('Error loading budget data:', error)
      monthsData.value = []
    }
  }

  const createMonth = async (year: number, month: number): Promise<void> => {
    try {
      const newMonth = await $fetch<MonthData>('/api/budget/months', {
        method: 'POST',
        body: { year, month },
      })

      if (newMonth) {
        monthsData.value = [...monthsData.value, toMutable(newMonth)]
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

      if (entryKind === 'balance') {
        const newBalanceSource: BalanceSourceData = {
          id: response.id ?? '',
          description: response.description ?? '',
          currency: response.currency ?? '',
          amount: response.amount ?? 0,
        }
        monthsData.value = monthsData.value.map((m, index) =>
          index === monthIndex
            ? { ...m, balanceSources: [...m.balanceSources, newBalanceSource] }
            : m,
        )
      }
      else if (entryKind === 'income') {
        const newIncomeEntry: IncomeEntryData = {
          id: response.id ?? '',
          description: response.description ?? '',
          currency: response.currency ?? '',
          amount: response.amount ?? 0,
          date: response.date ?? null,
        }
        monthsData.value = monthsData.value.map((m, index) =>
          index === monthIndex
            ? { ...m, incomeEntries: [...m.incomeEntries, newIncomeEntry] }
            : m,
        )
      }
      else if (entryKind === 'expense') {
        const newExpenseEntry: ExpenseEntryData = {
          id: response.id ?? '',
          description: response.description ?? '',
          currency: response.currency ?? '',
          amount: response.amount ?? 0,
          date: response.date ?? null,
        }
        monthsData.value = monthsData.value.map((m, index) =>
          index === monthIndex
            ? { ...m, expenseEntries: [...m.expenseEntries, newExpenseEntry] }
            : m,
        )
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

      if (!response) return

      monthsData.value = monthsData.value.map((month) => {
        const balanceIndex = month.balanceSources.findIndex(entry => entry.id === entryId)
        if (balanceIndex !== -1) {
          const currentEntry = month.balanceSources[balanceIndex]
          if (!currentEntry) return month

          const updatedBalance: BalanceSourceData = {
            ...currentEntry,
            description: response.description ?? currentEntry.description,
            amount: response.amount ?? currentEntry.amount,
            currency: response.currency ?? currentEntry.currency,
          }
          return {
            ...month,
            balanceSources: month.balanceSources.map((entry, index) =>
              index === balanceIndex ? updatedBalance : entry,
            ),
          }
        }

        const incomeIndex = month.incomeEntries.findIndex(entry => entry.id === entryId)
        if (incomeIndex !== -1) {
          const currentEntry = month.incomeEntries[incomeIndex]
          if (!currentEntry) return month

          const updatedIncome: IncomeEntryData = {
            ...currentEntry,
            description: response.description ?? currentEntry.description,
            amount: response.amount ?? currentEntry.amount,
            currency: response.currency ?? currentEntry.currency,
            date: response.date ?? currentEntry.date,
          }
          return {
            ...month,
            incomeEntries: month.incomeEntries.map((entry, index) =>
              index === incomeIndex ? updatedIncome : entry,
            ),
          }
        }

        const expenseIndex = month.expenseEntries.findIndex(entry => entry.id === entryId)
        if (expenseIndex !== -1) {
          const currentEntry = month.expenseEntries[expenseIndex]
          if (!currentEntry) return month

          const updatedExpense: ExpenseEntryData = {
            ...currentEntry,
            description: response.description ?? currentEntry.description,
            amount: response.amount ?? currentEntry.amount,
            currency: response.currency ?? currentEntry.currency,
            date: response.date ?? currentEntry.date,
          }
          return {
            ...month,
            expenseEntries: month.expenseEntries.map((entry, index) =>
              index === expenseIndex ? updatedExpense : entry,
            ),
          }
        }

        return month
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
        const balanceIndex = month.balanceSources.findIndex(entry => entry.id === entryId)
        if (balanceIndex !== -1) {
          return {
            ...month,
            balanceSources: month.balanceSources.filter(entry => entry.id !== entryId),
          }
        }

        const incomeIndex = month.incomeEntries.findIndex(entry => entry.id === entryId)
        if (incomeIndex !== -1) {
          return {
            ...month,
            incomeEntries: month.incomeEntries.filter(entry => entry.id !== entryId),
          }
        }

        const expenseIndex = month.expenseEntries.findIndex(entry => entry.id === entryId)
        if (expenseIndex !== -1) {
          return {
            ...month,
            expenseEntries: month.expenseEntries.filter(entry => entry.id !== entryId),
          }
        }

        return month
      })
    }
    catch (error) {
      console.error('Error deleting entry:', error)
      throw error
    }
  }

  return {
    monthsData: computed(() => monthsData.value),
    loadMonthsData,
    createMonth,
    addEntry,
    updateEntry,
    deleteEntry,
  }
}
