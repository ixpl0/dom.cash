<template>
  <UiEntryModal
    :is-open="isOpen"
    :title="entryModalTitle"
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
    :format-date="formatDate"
    :get-amount-tooltip="getAmountTooltip"
    :total-amount="totalAmount"
    :notice="lateEditNotice"
    @close="hide"
    @start-new="startAdd"
    @save-new="addEntry"
    @cancel-new="cancelAdd"
    @start-edit="startEdit"
    @save-edit="saveEntry"
    @cancel-edit="cancelEdit"
    @delete="deleteEntry"
    @update:editing-entry="editingEntry = $event"
    @update:new-entry="newEntry = $event"
  />
</template>

<script setup lang="ts">
import { useBudgetStore } from '~/stores/budget/budget'
import { useModalsStore } from '~/stores/budget/modals'
import type { BudgetEntry } from '~~/shared/types/budget'
import type { EntryKind } from '~~/shared/types'
import type { EntryFormData } from '~/composables/budget/useEntryForm'
import { getEntryErrorKey } from '~/utils/entry-validation'
import type { ConfirmationModalMessage } from '~/components/ui/ConfirmationModal.vue'
import type { BackSource } from '~/utils/back-handlers'
import { getFollowingMonth, getMonthStartDate, isLateToEditStartBalance, type MonthPosition } from '~~/shared/utils/budget/month-helpers'
import { formatPlainDate } from '~~/shared/utils/shared/dates'

const modalsStore = useModalsStore()
const budgetStore = useBudgetStore()
const { t, locale } = useI18n()
const { formatMoney, formatMoneyRounded } = useMoneyFormat()
const { formatError } = useServerError()
const { toast } = useToast()
const entryModal = computed(() => modalsStore.entryModal)
const isOpen = computed(() => entryModal.value.isOpen)

const currentMonth = computed(() => {
  if (!entryModal.value.monthId) {
    return null
  }
  return budgetStore.computedMonths.find(m => m.id === entryModal.value.monthId)
})

const mainCurrency = computed(() => budgetStore.effectiveMainCurrency)
const exchangeRates = computed(() => currentMonth.value?.exchangeRates)

const getAmountTooltip = (entry: BudgetEntry): string | undefined => {
  const rates = exchangeRates.value
  const baseCurrency = mainCurrency.value

  if (!rates || !baseCurrency || entry.currency === baseCurrency) {
    return undefined
  }

  const fromRate = rates[entry.currency] || 1
  const toRate = rates[baseCurrency] || 1
  const converted = (entry.amount / fromRate) * toRate

  return formatMoneyRounded(converted, baseCurrency)
}

const currentEntries = computed(() => {
  if (!entryModal.value.monthId || !entryModal.value.entryKind) {
    return []
  }

  return budgetStore.getEntriesByMonthAndKind(entryModal.value.monthId, entryModal.value.entryKind)
})

const totalAmount = computed(() => {
  const month = currentMonth.value
  const baseCurrency = mainCurrency.value
  const entryKind = entryModal.value.entryKind

  if (!month || !baseCurrency || !entryKind) {
    return undefined
  }

  const totalMap: Record<string, number> = {
    balance: month.startBalance ?? 0,
    income: month.totalIncome,
    expense: month.totalExpenses,
  }

  const total = totalMap[entryKind]
  if (total === undefined) {
    return undefined
  }

  return formatMoneyRounded(total, baseCurrency)
})

const { confirmDiscardChanges } = useUnsavedChanges()

const {
  isAdding,
  isDeleting,
  editingEntryId,
  isSaving,
  isAddingNewEntry,
  pendingAddId,
  editingEntry,
  newEntry,
  hasUnsavedChanges,
  modalTitle,
  emptyMessage,
  formatDate,
  startAdd,
  cancelAdd,
  startEdit,
  cancelEdit,
  resetForm,
} = useEntryForm(computed(() => entryModal.value.entryKind), mainCurrency)

const formatMonthStart = (monthPosition: MonthPosition): string =>
  formatPlainDate(getMonthStartDate(monthPosition), locale.value, { day: 'numeric', month: 'long' })

const entryModalTitle = computed((): string => {
  const month = currentMonth.value
  return entryModal.value.entryKind === 'balance' && month
    ? t('entry.balance.titleOnDate', { date: formatMonthStart(month) })
    : modalTitle.value
})

const lateEditNotice = computed((): string | undefined => {
  const month = currentMonth.value
  const { entryKind, isReadOnly } = entryModal.value

  if (!isOpen.value || entryKind !== 'balance' || isReadOnly || !month || !isLateToEditStartBalance(month)) {
    return undefined
  }

  return t('entry.balance.lateEditNotice', {
    startDate: formatMonthStart(month),
    nextStartDate: formatMonthStart(getFollowingMonth(month)),
    month: budgetStore.monthNames[month.month] ?? '',
  })
})

const performAddEntry = async (entryData: EntryFormData) => {
  if (!entryModal.value.monthId || !entryModal.value.entryKind) {
    throw new Error(t('entry.monthIdRequired'))
  }

  await budgetStore.addEntry(
    entryModal.value.monthId,
    entryModal.value.entryKind,
    {
      id: pendingAddId.value ?? undefined,
      description: entryData.description,
      amount: entryData.amount,
      currency: entryData.currency,
      date: entryModal.value.entryKind !== 'balance' ? entryData.date : undefined,
      isOptional: entryModal.value.entryKind === 'expense' ? entryData.isOptional : undefined,
    },
  )
}

const performUpdateEntry = async (entryId: string, entryData: EntryFormData) => {
  await budgetStore.updateEntry(entryId, {
    description: entryData.description,
    amount: entryData.amount,
    currency: entryData.currency,
    date: entryModal.value.entryKind !== 'balance' ? entryData.date : undefined,
    isOptional: entryModal.value.entryKind === 'expense' ? entryData.isOptional : undefined,
  })
}

const performDeleteEntry = async (entryId: string) => {
  await budgetStore.deleteEntry(entryId)
}

const validateEntry = (entry: { description: string, amount: number | null | undefined }, entryKind: EntryKind | null): string | null => {
  const errorKey = entryKind ? getEntryErrorKey(entry, entryKind) : null
  return errorKey ? t(errorKey) : null
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
  { text: formatMoney(entry.amount, entry.currency), isBold: true },
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
  if (!(await confirmDiscardChanges(hasUnsavedChanges.value, 'close'))) {
    return
  }

  modalsStore.closeEntryModal()
}

const isEditingEntry = computed(() => isAddingNewEntry.value || editingEntryId.value !== null)

const stopEditing = (): void => {
  if (isAddingNewEntry.value) {
    cancelAdd()
  }

  if (editingEntryId.value) {
    cancelEdit()
  }
}

const stopEditingOnBack = async (source: BackSource): Promise<void> => {
  if (isAdding.value || isSaving.value) {
    return
  }

  if (source === 'history' && !(await confirmDiscardChanges(hasUnsavedChanges.value, 'stopEditing'))) {
    return
  }

  stopEditing()
}

useBackHandler(() => isOpen.value && isEditingEntry.value, stopEditingOnBack)

watch(() => entryModal.value.isOpen, (newIsOpen) => {
  if (newIsOpen) {
    resetForm()
  }
})

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
