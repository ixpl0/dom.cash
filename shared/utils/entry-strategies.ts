import type { MonthData, BalanceSourceData, IncomeEntryData, ExpenseEntryData } from '~~/shared/types/budget'
import type { EntryKind } from '~~/server/db/schema'

interface EntryConfig {
  title: string
  emptyMessage: string
  arrayKey: keyof MonthData
  createEntry: (data: { id: string, description: string, amount: number, currency: string, date?: string | null, isOptional?: boolean }) => BalanceSourceData | IncomeEntryData | ExpenseEntryData
}

export const entryStrategies: Record<EntryKind, EntryConfig> = {
  balance: {
    title: 'Источники баланса',
    emptyMessage: 'Пока нет источников баланса',
    arrayKey: 'balanceSources',
    createEntry: data => ({
      id: data.id,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
    } as BalanceSourceData),
  },
  income: {
    title: 'Доходы',
    emptyMessage: 'Пока нет доходов',
    arrayKey: 'incomeEntries',
    createEntry: data => ({
      id: data.id,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      date: data.date || null,
    } as IncomeEntryData),
  },
  expense: {
    title: 'Крупные расходы',
    emptyMessage: 'Пока нет крупных расходов',
    arrayKey: 'expenseEntries',
    createEntry: data => ({
      id: data.id,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      date: data.date || null,
      isOptional: data.isOptional || false,
    } as ExpenseEntryData),
  },
}

export const getEntryConfig = (entryKind: EntryKind): EntryConfig => {
  return entryStrategies[entryKind]
}

export const updateMonthWithNewEntry = (
  month: MonthData,
  entryKind: EntryKind,
  newEntry: BalanceSourceData | IncomeEntryData | ExpenseEntryData,
): MonthData => {
  const config = getEntryConfig(entryKind)
  const currentEntries = month[config.arrayKey] as Array<BalanceSourceData | IncomeEntryData | ExpenseEntryData>

  return {
    ...month,
    [config.arrayKey]: [...currentEntries, newEntry],
  }
}

export const updateMonthWithUpdatedEntry = (
  month: MonthData,
  entryKind: EntryKind,
  entryId: string,
  updateData: { description?: string, amount?: number, currency?: string, date?: string | null, isOptional?: boolean },
): MonthData => {
  const config = getEntryConfig(entryKind)
  const currentEntries = month[config.arrayKey] as Array<BalanceSourceData | IncomeEntryData | ExpenseEntryData>

  const entryIndex = currentEntries.findIndex(entry => entry.id === entryId)
  if (entryIndex === -1) return month

  const currentEntry = currentEntries[entryIndex]
  if (!currentEntry) return month

  const updatedEntry = config.createEntry({
    id: currentEntry.id,
    description: updateData.description ?? currentEntry.description,
    amount: updateData.amount ?? currentEntry.amount,
    currency: updateData.currency ?? currentEntry.currency,
    date: updateData.date !== undefined ? updateData.date : ('date' in currentEntry ? currentEntry.date : undefined),
    isOptional: updateData.isOptional !== undefined ? updateData.isOptional : ('isOptional' in currentEntry ? currentEntry.isOptional : undefined),
  })

  const updatedEntries = currentEntries.map((entry, index) =>
    index === entryIndex ? updatedEntry : entry,
  )

  return {
    ...month,
    [config.arrayKey]: updatedEntries,
  }
}

export const updateMonthWithDeletedEntry = (
  month: MonthData,
  entryKind: EntryKind,
  entryId: string,
): MonthData => {
  const config = getEntryConfig(entryKind)
  const currentEntries = month[config.arrayKey] as Array<BalanceSourceData | IncomeEntryData | ExpenseEntryData>

  return {
    ...month,
    [config.arrayKey]: currentEntries.filter(entry => entry.id !== entryId),
  }
}

export const findEntryKindByEntryId = (month: MonthData, entryId: string): EntryKind | null => {
  const strategies: EntryKind[] = ['balance', 'income', 'expense']

  for (const kind of strategies) {
    const config = getEntryConfig(kind)
    const entries = month[config.arrayKey] as Array<BalanceSourceData | IncomeEntryData | ExpenseEntryData>
    if (entries.some(entry => entry.id === entryId)) {
      return kind
    }
  }

  return null
}
