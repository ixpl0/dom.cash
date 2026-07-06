export type EntryAmountKind = 'balance' | 'income' | 'expense'

const positiveAmountClasses: Record<EntryAmountKind, string> = {
  balance: 'text-primary',
  income: 'text-success',
  expense: 'text-error',
}

export const getEntryAmountClass = (entryKind: EntryAmountKind, amount: number): string => {
  if (amount < 0) {
    return 'text-warning'
  }
  if (amount === 0) {
    return 'text-base-content'
  }
  return positiveAmountClasses[entryKind]
}
