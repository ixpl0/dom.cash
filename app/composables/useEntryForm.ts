import type { BudgetEntry } from '~~/shared/types/budget'
import { getEntryConfig } from '~~/shared/utils/entry-strategies'

export interface EntryFormData {
  description: string
  amount: number
  currency: string
  date: string
}

export interface EntryFormState {
  isAdding: Ref<boolean>
  isDeleting: Ref<string | null>
  editingEntryId: Ref<string | null>
  isSaving: Ref<boolean>
  isAddingNewEntry: Ref<boolean>
  editingEntry: Ref<EntryFormData>
  newEntry: Ref<EntryFormData>
}

export const useEntryForm = (entryKind: 'balance' | 'income' | 'expense') => {
  const isAdding = ref(false)
  const isDeleting = ref<string | null>(null)
  const editingEntryId = ref<string | null>(null)
  const isSaving = ref(false)
  const isAddingNewEntry = ref(false)

  const createDefaultFormData = (): EntryFormData => ({
    description: '',
    amount: 0,
    currency: '',
    date: new Date().toISOString().split('T')[0] || '',
  })

  const editingEntry = ref(createDefaultFormData())
  const newEntry = ref(createDefaultFormData())

  const getEntryDate = (entry: BudgetEntry): string | null => {
    return 'date' in entry ? entry.date : null
  }

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('ru-RU')
  }

  const startAdd = (): void => {
    isAddingNewEntry.value = true
    newEntry.value = createDefaultFormData()
  }

  const cancelAdd = (): void => {
    isAddingNewEntry.value = false
    newEntry.value = createDefaultFormData()
  }

  const startEdit = (entry: BudgetEntry): void => {
    editingEntryId.value = entry.id
    editingEntry.value = {
      description: entry.description,
      amount: entry.amount,
      currency: entry.currency,
      date: getEntryDate(entry) || '',
    }
  }

  const cancelEdit = (): void => {
    editingEntryId.value = null
    editingEntry.value = createDefaultFormData()
  }

  const config = getEntryConfig(entryKind)

  const getModalTitle = (): string => config.title
  const getEmptyMessage = (): string => config.emptyMessage

  return {
    isAdding,
    isDeleting,
    editingEntryId,
    isSaving,
    isAddingNewEntry,
    editingEntry,
    newEntry,
    modalTitle: computed(getModalTitle),
    emptyMessage: computed(getEmptyMessage),
    getEntryDate,
    formatDate,
    startAdd,
    cancelAdd,
    startEdit,
    cancelEdit,
  }
}
