import type { MonthData, BalanceSourceData, IncomeEntryData, ExpenseEntryData } from '~~/shared/types/budget'

const toMutable = <T>(data: T): T => JSON.parse(JSON.stringify(data))

export const useBudgetData = () => {
  const monthsData = useState<MonthData[]>('budget.months', () => [])

  const loadMonthsData = async (): Promise<void> => {
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const data = await $fetch<MonthData[]>('/api/budget/months', { headers })
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
        const newMonthData = toMutable(newMonth)
        const updatedMonths = [...monthsData.value, newMonthData]

        updatedMonths.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year
          return b.month - a.month
        })

        monthsData.value = updatedMonths
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

  const getNextMonth = (currentMonths: MonthData[]): { year: number, month: number } => {
    if (currentMonths.length === 0) {
      const now = new Date()
      return { year: now.getFullYear(), month: now.getMonth() }
    }

    const sortedMonths = [...currentMonths].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })

    const latest = sortedMonths[0]!
    const nextMonth = latest.month === 11 ? 0 : latest.month + 1
    const nextYear = latest.month === 11 ? latest.year + 1 : latest.year

    return { year: nextYear, month: nextMonth }
  }

  const getPreviousMonth = (currentMonths: MonthData[]): { year: number, month: number } => {
    if (currentMonths.length === 0) {
      const now = new Date()
      return { year: now.getFullYear(), month: now.getMonth() }
    }

    const sortedMonths = [...currentMonths].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })

    const earliest = sortedMonths[0]!
    const prevMonth = earliest.month === 0 ? 11 : earliest.month - 1
    const prevYear = earliest.month === 0 ? earliest.year - 1 : earliest.year

    return { year: prevYear, month: prevMonth }
  }

  const createNextMonth = async (): Promise<void> => {
    const nextMonth = getNextMonth(monthsData.value)
    await createMonth(nextMonth.year, nextMonth.month)
  }

  const createPreviousMonth = async (): Promise<void> => {
    const prevMonth = getPreviousMonth(monthsData.value)
    await createMonth(prevMonth.year, prevMonth.month)
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
