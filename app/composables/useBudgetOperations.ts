import type { EntryFormData } from './useEntryForm'

type EmitFunction = (event: 'added' | 'deleted' | 'updated', entryId?: string) => void

export const useBudgetOperations = (
  monthId: MaybeRef<string | null>,
  entryKind: MaybeRef<'balance' | 'income' | 'expense' | null>,
  emit: EmitFunction,
  targetUsername?: MaybeRef<string | undefined>,
) => {
  const budget = useBudget(unref(targetUsername))

  const addEntry = async (entryData: EntryFormData): Promise<void> => {
    const monthIdValue = unref(monthId)
    const entryKindValue = unref(entryKind)

    if (!monthIdValue || !entryKindValue) {
      throw new Error('Month ID and entry kind are required')
    }

    await budget.addEntry(
      monthIdValue,
      entryKindValue,
      {
        description: entryData.description,
        amount: entryData.amount,
        currency: entryData.currency,
        date: entryKindValue !== 'balance' ? entryData.date : undefined,
      },
    )

    emit('added')
  }

  const updateEntry = async (entryId: string, entryData: EntryFormData): Promise<void> => {
    const entryKindValue = unref(entryKind)

    if (!entryKindValue) {
      throw new Error('Entry kind is required')
    }

    await budget.updateEntry(entryId, {
      description: entryData.description,
      amount: entryData.amount,
      currency: entryData.currency,
      date: entryKindValue !== 'balance' ? entryData.date : undefined,
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
