import type { MonthData, BalanceSourceData, IncomeEntryData, ExpenseEntryData, BudgetEntry, SavedEntry } from '~~/shared/types/budget'
import { ENTRY_KINDS, type EntryKind } from '~~/shared/schemas/common'

interface EntryConfig {
  titleKey: string
  emptyMessageKey: string
  arrayKey: keyof MonthData
  createEntry: (data: SavedEntry) => BudgetEntry
}

export const entryStrategies: Record<EntryKind, EntryConfig> = {
  balance: {
    titleKey: 'entry.balance.title',
    emptyMessageKey: 'entry.balance.emptyMessage',
    arrayKey: 'balanceSources',
    createEntry: data => ({
      id: data.id,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
    } as BalanceSourceData),
  },
  income: {
    titleKey: 'entry.income.title',
    emptyMessageKey: 'entry.income.emptyMessage',
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
    titleKey: 'entry.expense.title',
    emptyMessageKey: 'entry.expense.emptyMessage',
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

export const monthHasEntry = (
  month: MonthData,
  entryKind: EntryKind,
  entryId: string,
): boolean => {
  const config = getEntryConfig(entryKind)
  const entries = month[config.arrayKey] as BudgetEntry[]
  return entries.some(entry => entry.id === entryId)
}

export const updateMonthWithNewEntry = (
  month: MonthData,
  entryKind: EntryKind,
  newEntry: BudgetEntry,
): MonthData => {
  const config = getEntryConfig(entryKind)
  const currentEntries = month[config.arrayKey] as BudgetEntry[]

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
  const currentEntries = month[config.arrayKey] as BudgetEntry[]

  const entryIndex = currentEntries.findIndex(entry => entry.id === entryId)
  if (entryIndex === -1) {
    return month
  }

  const currentEntry = currentEntries[entryIndex]
  if (!currentEntry) {
    return month
  }

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
  const currentEntries = month[config.arrayKey] as BudgetEntry[]

  return {
    ...month,
    [config.arrayKey]: currentEntries.filter(entry => entry.id !== entryId),
  }
}

export const findEntryKindByEntryId = (month: MonthData, entryId: string): EntryKind | null =>
  ENTRY_KINDS.find(kind => monthHasEntry(month, kind, entryId)) ?? null
