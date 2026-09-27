import type { BudgetEntry } from '~~/shared/types/budget'
import { getEntryConfig } from '~~/shared/utils/budget/entry-strategies'

export interface EntryFormData {
  description: string
  amount: number
  currency: string
  date: string
  isOptional?: boolean
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

export const useEntryForm = (
  entryKind: MaybeRef<'balance' | 'income' | 'expense' | null>,
  defaultCurrency: MaybeRef<string> = '',
) => {
  const { locale, t } = useI18n()
  const isAdding = ref(false)
  const isDeleting = ref<string | null>(null)
  const editingEntryId = ref<string | null>(null)
  const isSaving = ref(false)
  const isAddingNewEntry = ref(false)
  const pendingAddId = ref<string | null>(null)

  const createDefaultFormData = (): EntryFormData => ({
    description: '',
    amount: 0,
    currency: unref(defaultCurrency),
    date: new Date().toISOString().split('T')[0] || '',
    isOptional: false,
  })

  const editingEntry = ref(createDefaultFormData())
  const newEntry = ref(createDefaultFormData())
  const initialFormData = ref<EntryFormData | null>(null)

  const isSameFormData = (first: EntryFormData, second: EntryFormData): boolean =>
    first.description === second.description
    && first.amount === second.amount
    && first.currency === second.currency
    && first.date === second.date
    && Boolean(first.isOptional) === Boolean(second.isOptional)

  const hasUnsavedChanges = computed((): boolean => {
    if (!initialFormData.value) {
      return false
    }

    const currentFormData = isAddingNewEntry.value ? newEntry.value : editingEntry.value
    return !isSameFormData(currentFormData, initialFormData.value)
  })

  const getEntryDate = (entry: BudgetEntry): string | null => {
    return 'date' in entry ? entry.date : null
  }

  const formatDate = (date: string | null | undefined): string => {
    if (!date) {
      return '—'
    }
    return new Date(date).toLocaleDateString(locale.value)
  }

  const startAdd = (): void => {
    if (editingEntryId.value) {
      editingEntryId.value = null
      editingEntry.value = createDefaultFormData()
    }
    isAddingNewEntry.value = true
    newEntry.value = createDefaultFormData()
    initialFormData.value = { ...newEntry.value }
    pendingAddId.value = crypto.randomUUID()
  }

  const cancelAdd = (): void => {
    isAddingNewEntry.value = false
    newEntry.value = createDefaultFormData()
    initialFormData.value = null
    pendingAddId.value = null
  }

  const startEdit = (entry: BudgetEntry): void => {
    if (isAddingNewEntry.value) {
      isAddingNewEntry.value = false
      newEntry.value = createDefaultFormData()
    }
    editingEntryId.value = entry.id
    editingEntry.value = {
      description: entry.description,
      amount: entry.amount,
      currency: entry.currency,
      date: getEntryDate(entry) || '',
      isOptional: 'isOptional' in entry ? entry.isOptional : false,
    }
    initialFormData.value = { ...editingEntry.value }
  }

  const cancelEdit = (): void => {
    editingEntryId.value = null
    editingEntry.value = createDefaultFormData()
    initialFormData.value = null
  }

  const resetForm = (): void => {
    isAdding.value = false
    isDeleting.value = null
    editingEntryId.value = null
    isSaving.value = false
    isAddingNewEntry.value = false
    pendingAddId.value = null
    editingEntry.value = createDefaultFormData()
    newEntry.value = createDefaultFormData()
    initialFormData.value = null
  }

  const kindValue = computed(() => unref(entryKind) || 'balance')
  const config = computed(() => getEntryConfig(kindValue.value))

  const getModalTitle = (): string => t(config.value.titleKey)
  const getEmptyMessage = (): string => t(config.value.emptyMessageKey)

  return {
    isAdding,
    isDeleting,
    editingEntryId,
    isSaving,
    isAddingNewEntry,
    pendingAddId,
    editingEntry,
    newEntry,
    hasUnsavedChanges,
    modalTitle: computed(getModalTitle),
    emptyMessage: computed(getEmptyMessage),
    getEntryDate,
    formatDate,
    startAdd,
    cancelAdd,
    startEdit,
    cancelEdit,
    resetForm,
  }
}
