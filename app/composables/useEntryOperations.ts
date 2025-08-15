import type { EntryFormData } from './useEntryForm'

type EmitFunction = (event: 'added' | 'deleted' | 'updated', entryId?: string) => void

export const useEntryOperations = (
  monthId: string,
  entryKind: 'balance' | 'income' | 'expense',
  emit: EmitFunction,
  targetUsername?: string,
) => {
  const { addEntry: addEntryToStore, updateEntry: updateEntryInStore, deleteEntry: deleteEntryFromStore } = useBudgetData(targetUsername)

  const addEntry = async (entryData: EntryFormData): Promise<void> => {
    if (!entryData.description.trim() || entryData.amount <= 0) {
      return
    }

    await addEntryToStore(
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
    if (!entryData.description.trim() || entryData.amount <= 0) {
      return
    }

    await updateEntryInStore(entryId, {
      description: entryData.description,
      amount: entryData.amount,
      currency: entryData.currency,
      date: entryKind !== 'balance' ? entryData.date : undefined,
    })

    emit('updated', entryId)
  }

  const deleteEntry = async (entryId: string): Promise<void> => {
    await deleteEntryFromStore(entryId)
    emit('deleted', entryId)
  }

  return {
    addEntry,
    updateEntry,
    deleteEntry,
  }
}
