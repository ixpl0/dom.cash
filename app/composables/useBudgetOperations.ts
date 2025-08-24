import type { EntryFormData } from './useEntryForm'

type EmitFunction = (event: 'added' | 'deleted' | 'updated', entryId?: string) => void

export const useBudgetOperations = (
  monthId: string,
  entryKind: 'balance' | 'income' | 'expense',
  emit: EmitFunction,
  targetUsername?: string,
) => {
  const budget = useBudget(targetUsername)

  const addEntry = async (entryData: EntryFormData): Promise<void> => {
    await budget.addEntry(
      monthId,
      entryKind,
      {
        description: entryData.description,
        amount: entryData.amount,
        currency: entryData.currency,
        date: entryKind !== 'balance' ? entryData.date : undefined,
      },
    )

    emit('added')
  }

  const updateEntry = async (entryId: string, entryData: EntryFormData): Promise<void> => {
    await budget.updateEntry(entryId, {
      description: entryData.description,
      amount: entryData.amount,
      currency: entryData.currency,
      date: entryKind !== 'balance' ? entryData.date : undefined,
    })

    emit('updated', entryId)
  }

  const deleteEntry = async (entryId: string): Promise<void> => {
    await budget.deleteEntry(entryId)
    emit('deleted', entryId)
  }

  return {
    addEntry,
    updateEntry,
    deleteEntry,
  }
}
