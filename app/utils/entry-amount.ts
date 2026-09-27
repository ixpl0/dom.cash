import type { EntryKind } from '~~/shared/types'

const positiveAmountClasses: Record<EntryKind, string> = {
  balance: 'text-primary',
  income: 'text-success',
  expense: 'text-error',
}

export const getEntryAmountClass = (entryKind: EntryKind, amount: number): string => {
  if (amount < 0) {
    return 'text-warning'
  }
  if (amount === 0) {
    return 'text-base-content'
  }
  return positiveAmountClasses[entryKind]
}
