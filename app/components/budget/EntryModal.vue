<template>
  <UiEntryModal
    ref="modalRef"
    :is-open="isOpen"
    :title="modalTitle"
    :entries="currentEntries"
    :entry-kind="entryModal.entryKind || 'balance'"
    :is-read-only="entryModal.isReadOnly"
    :empty-message="emptyMessage"
    :editing-entry-id="editingEntryId"
    :editing-entry="editingEntry"
    :new-entry="newEntry"
    :is-adding-new-entry="isAddingNewEntry"
    :is-adding="isAdding"
    :is-saving="isSaving"
    :deleting-entry-id="isDeleting"
    :description-label="t('entry.description')"
    :amount-label="t('entry.amount')"
    :currency-label="t('entry.currency')"
    :date-label="t('entry.date')"
    :optional-label="t('entry.optional')"
    :actions-label="t('entry.actions')"
    :add-button-label="t('entry.addNew')"
    :description-placeholder="t('entryEdit.descriptionPlaceholder')"
    :amount-placeholder="t('entryEdit.amountPlaceholder')"
    :format-date="formatDate"
    @close="hide"
    @start-new="startAdd"
    @save-new="addEntry"
    @cancel-new="cancelAdd"
    @start-edit="startEdit"
    @start-edit-with-focus="startEditWithFocus"
    @save-edit="saveEntry"
    @cancel-edit="cancelEdit"
    @delete="deleteEntry"
    @update:editing-entry="editingEntry = $event"
    @update:new-entry="newEntry = $event"
  />
</template>

<script setup lang="ts">
import { formatAmount } from '~~/shared/utils/budget'
import { useModalsStore } from '~/stores/modals'
import { useBudgetStore } from '~/stores/budget'
import type { BudgetEntry } from '~~/shared/types/budget'
import type { ConfirmationModalMessage } from '~/components/ui/ConfirmationModal.vue'

const modalsStore = useModalsStore()
const budgetStore = useBudgetStore()
const { t } = useI18n()
const { formatError } = useServerError()
const { toast } = useToast()
const entryModal = computed(() => modalsStore.entryModal)
const isOpen = computed(() => entryModal.value.isOpen)

const currentEntries = computed(() => {
  if (!entryModal.value.monthId || !entryModal.value.entryKind) {
    return []
  }

  return budgetStore.getEntriesByMonthAndKind(entryModal.value.monthId, entryModal.value.entryKind)
})

const emit = defineEmits<{
  added: []
  deleted: [entryId: string]
  updated: [entryId: string]
}>()

const { confirmClose, markAsChanged, markAsSaved } = useUnsavedChanges()

const {
  isAdding,
  isDeleting,
  editingEntryId,
  isSaving,
  isAddingNewEntry,
  editingEntry,
  newEntry,
  modalTitle,
  emptyMessage,
  formatDate,
  startAdd,
  cancelAdd,
  startEdit,
  cancelEdit,
  resetForm,
} = useEntryForm(computed(() => entryModal.value.entryKind))

const emitWrapper = (event: 'added' | 'deleted' | 'updated', entryId?: string) => {
  if (event === 'added') {
    emit('added')
  }
  else if (event === 'deleted' && entryId) {
    emit('deleted', entryId)
  }
  else if (event === 'updated' && entryId) {
    emit('updated', entryId)
  }
}

const performAddEntry = async (entryData: { description: string, amount: number, currency: string, date: string, isOptional?: boolean }) => {
  if (!entryModal.value.monthId || !entryModal.value.entryKind) {
    throw new Error('Month ID and entry kind are required')
  }

  await budgetStore.addEntry(
    entryModal.value.monthId,
    entryModal.value.entryKind,
    {
      description: entryData.description,
      amount: entryData.amount,
      currency: entryData.currency,
      date: entryModal.value.entryKind !== 'balance' ? entryData.date : undefined,
      isOptional: entryModal.value.entryKind === 'expense' ? entryData.isOptional : undefined,
    },
  )

  emitWrapper('added')
}

const performUpdateEntry = async (entryId: string, entryData: { description: string, amount: number, currency: string, date: string, isOptional?: boolean }) => {
  await budgetStore.updateEntry(entryId, {
    description: entryData.description,
    amount: entryData.amount,
    currency: entryData.currency,
    date: entryModal.value.entryKind !== 'balance' ? entryData.date : undefined,
    isOptional: entryModal.value.entryKind === 'expense' ? entryData.isOptional : undefined,
  })

  emitWrapper('updated', entryId)
}

const performDeleteEntry = async (entryId: string) => {
  await budgetStore.deleteEntry(entryId)
  emitWrapper('deleted', entryId)
}

const focusField = ref<string | null>(null)
const modalRef = ref<{ $el: HTMLElement } | null>(null)

const startEditWithFocus = (entry: BudgetEntry, fieldToFocus: string): void => {
  if (entryModal.value.isReadOnly) {
    return
  }

  focusField.value = fieldToFocus
  startEdit(entry)
}

const validateEntry = (entry: { description: string, amount: number | null | undefined }, entryKind: string | null): string | null => {
  if (!entry.description.trim()) {
    return t('entry.errors.descriptionRequired')
  }

  if (entry.amount === null || entry.amount === undefined) {
    return t('entry.errors.amountRequired')
  }

  const isBalanceEntry = entryKind === 'balance'
  if (isBalanceEntry && entry.amount < 0) {
    return t('entry.errors.amountNonNegative')
  }

  if (!isBalanceEntry && entry.amount <= 0) {
    return t('entry.errors.amountPositive')
  }

  return null
}

const addEntry = async (): Promise<void> => {
  if (isAdding.value) {
    return
  }

  const validationError = validateEntry(newEntry.value, entryModal.value.entryKind)
  if (validationError) {
    toast({ type: 'error', message: validationError })
    return
  }

  isAdding.value = true

  try {
    await performAddEntry(newEntry.value)
    markAsSaved()
    cancelAdd()
  }
  catch (error) {
    console.error('Error adding entry:', error)
    toast({ type: 'error', message: formatError(error, t('entry.errors.addFailed')) })
  }
  finally {
    isAdding.value = false
  }
}

const getDeleteEntryConfirmMessage = (
  entry: BudgetEntry,
  entryType: string,
): ConfirmationModalMessage => [
  `${t('entry.deleteMessageWithEntry', { entryType })}:`,
  { text: entry.description, isBold: true },
  { isDivider: true },
  { text: formatAmount(entry.amount, entry.currency), isBold: true },
]

const deleteEntry = async (entryId: string): Promise<void> => {
  if (isDeleting.value) {
    return
  }

  const entry = currentEntries.value.find(e => e.id === entryId)

  const entryType = entryModal.value.entryKind === 'balance'
    ? t('entry.deleteBalance')
    : entryModal.value.entryKind === 'income'
      ? t('entry.deleteIncome')
      : t('entry.deleteExpense')

  const confirmMessage = entry
    ? getDeleteEntryConfirmMessage(entry, entryType)
    : t('entry.deleteMessageFallback', { entryType })

  const { confirm } = useConfirmation()
  const confirmed = await confirm({
    title: t('entry.deleteTitle'),
    message: confirmMessage,
    variant: 'danger',
    confirmText: t('entry.deleteConfirm'),
    cancelText: t('common.cancel'),
    icon: 'heroicons:trash',
  })

  if (!confirmed) {
    return
  }

  isDeleting.value = entryId

  try {
    await performDeleteEntry(entryId)
  }
  catch (error) {
    console.error('Error deleting entry:', error)
    toast({ type: 'error', message: formatError(error, t('entry.errors.deleteFailed')) })
  }
  finally {
    isDeleting.value = null
  }
}

const hide = async (): Promise<void> => {
  if (!(await confirmClose())) {
    return
  }

  markAsSaved()
  modalsStore.closeEntryModal()
}

watch(() => entryModal.value.isOpen, (newIsOpen) => {
  if (newIsOpen) {
    resetForm()
    markAsSaved()
  }
})

watch([isAddingNewEntry, editingEntryId], () => {
  markAsSaved()
})

watch(editingEntryId, async (newEditingId) => {
  if (newEditingId && focusField.value) {
    await nextTick()

    let selector = ''
    switch (focusField.value) {
      case 'description':
        selector = '[data-testid="entry-description-input"]'
        break
      case 'amount':
        selector = '[data-testid="entry-amount-input"]'
        break
      case 'date':
        selector = 'input[type="date"]'
        break
      case 'optional':
        selector = '[data-testid="entry-optional-checkbox"]'
        break
      case 'currency':
        selector = '[data-testid="currency-picker-input"]'
        break
    }

    if (selector) {
      const element = modalRef.value?.$el?.querySelector(selector) as HTMLInputElement

      if (element) {
        if (focusField.value === 'currency') {
          requestAnimationFrame(() => {
            element.focus()
          })
        }
        else if (focusField.value === 'date') {
          element.showPicker?.()
        }
        else {
          element.focus()
          element.select()
        }
      }
    }

    focusField.value = null
  }
})

watch([newEntry, editingEntry], () => {
  if (isAddingNewEntry.value || editingEntryId.value) {
    markAsChanged()
  }
}, { deep: true })

const saveEntry = async (): Promise<void> => {
  if (isSaving.value) {
    return
  }

  if (!editingEntryId.value) {
    return
  }

  const validationError = validateEntry(editingEntry.value, entryModal.value.entryKind)
  if (validationError) {
    toast({ type: 'error', message: validationError })
    return
  }

  isSaving.value = true

  try {
    await performUpdateEntry(editingEntryId.value, editingEntry.value)
    markAsSaved()
    cancelEdit()
  }
  catch (error) {
    console.error('Error updating entry:', error)
    toast({ type: 'error', message: formatError(error, t('entry.errors.updateFailed')) })
  }
  finally {
    isSaving.value = false
  }
}
</script>
