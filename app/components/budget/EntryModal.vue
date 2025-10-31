<template>
  <UiDialog
    ref="modalRef"
    :is-open="isOpen"
    data-testid="entry-modal"
    content-class="modal-box w-[calc(100vw-2rem)] max-w-5xl max-h-[90vh] flex flex-col overflow-visible"
    @close="hide"
  >
    <button
      type="button"
      class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
      data-testid="modal-close-button"
      @click="hide()"
    >
      <Icon
        name="heroicons:x-mark"
        size="20"
      />
    </button>

    <h3 class="font-bold text-lg mb-4 flex-shrink-0">
      {{ modalTitle }}
    </h3>

    <div class="space-y-4 flex-1 overflow-y-auto overflow-x-auto min-h-0">
      <div
        v-if="currentEntries.length || isAddingNewEntry"
        class="min-w-[600px]"
      >
        <table class="table text-center">
          <thead>
            <tr>
              <th>{{ t('entry.description') }}</th>
              <th>{{ t('entry.amount') }}</th>
              <th>{{ t('entry.currency') }}</th>
              <th v-if="entryModal.entryKind !== 'balance'">
                {{ t('entry.date') }}
              </th>
              <th v-if="entryModal.entryKind === 'expense'">
                {{ t('entry.optional') }}
              </th>
              <th class="w-1">
                {{ t('entry.actions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <template
              v-for="entry in currentEntries"
              :key="entry.id"
            >
              <BudgetEntryEditRow
                v-if="editingEntryId === entry.id"
                v-model="editingEntry"
                :entry-kind="entryModal.entryKind || 'balance'"
                :is-saving="isSaving"
                @save="saveEntry()"
                @cancel="cancelEdit()"
              />
              <tr
                v-else
                data-testid="entry-row"
              >
                <td
                  class="cursor-pointer hover:bg-base-200"
                  @click="startEditWithFocus(entry, 'description')"
                >
                  <span>{{ entry.description }}</span>
                </td>
                <td
                  class="cursor-pointer hover:bg-base-200"
                  @click="startEditWithFocus(entry, 'amount')"
                >
                  <span
                    :class="{
                      'text-success': entryModal.entryKind === 'income' && entry.amount > 0,
                      'text-error': entryModal.entryKind === 'expense' && entry.amount > 0,
                      'text-primary': entryModal.entryKind === 'balance' && entry.amount > 0,
                      'text-base-content': entry.amount === 0,
                      'text-warning': entry.amount < 0,
                    }"
                  >{{ formatAmount(entry.amount, entry.currency) }}</span>
                </td>
                <td
                  class="cursor-pointer hover:bg-base-200"
                  @click="startEditWithFocus(entry, 'currency')"
                >
                  <span>{{ entry.currency }}</span>
                </td>
                <td
                  v-if="entryModal.entryKind !== 'balance'"
                  class="cursor-pointer hover:bg-base-200"
                  @click="startEditWithFocus(entry, 'date')"
                >
                  <span>{{ formatDate(getEntryDate(entry)) }}</span>
                </td>
                <td
                  v-if="entryModal.entryKind === 'expense'"
                  class="cursor-pointer hover:bg-base-200"
                  @click="startEditWithFocus(entry, 'optional')"
                >
                  <Icon
                    v-if="'isOptional' in entry && (entry as any).isOptional"
                    name="heroicons:check"
                    size="20"
                    class="text-success inline-block"
                  />
                </td>
                <td class="w-1">
                  <div class="flex gap-2">
                    <button
                      v-if="!entryModal.isReadOnly"
                      class="btn btn-sm btn-warning"
                      data-testid="entry-edit-button"
                      @click="startEdit(entry)"
                    >
                      <Icon
                        name="heroicons:pencil-square"
                        size="16"
                      />
                    </button>
                    <button
                      v-if="!entryModal.isReadOnly"
                      class="btn btn-sm btn-error"
                      :disabled="isDeleting === entry.id"
                      @click="deleteEntry(entry.id)"
                    >
                      <span
                        v-if="isDeleting === entry.id"
                        class="loading loading-spinner loading-xs"
                      />
                      <Icon
                        v-else
                        name="heroicons:trash"
                        size="16"
                      />
                    </button>
                  </div>
                </td>
              </tr>
            </template>
            <BudgetEntryEditRow
              v-if="isAddingNewEntry"
              v-model="newEntry"
              :entry-kind="entryModal.entryKind || 'balance'"
              :is-saving="isAdding"
              :is-new="true"
              @save="addEntry()"
              @cancel="cancelAdd()"
            />
          </tbody>
        </table>

        <div class="flex justify-center mt-4">
          <button
            v-if="!isAddingNewEntry && !entryModal.isReadOnly"
            class="btn btn-primary btn-sm"
            data-testid="add-entry-button"
            @click="startAdd()"
          >
            {{ t('entry.addNew') }}
          </button>
        </div>
      </div>

      <div
        v-else
        class="text-center py-8 text-base-content/60"
      >
        <div class="mb-4">
          {{ emptyMessage }}
        </div>
        <button
          v-if="!isAddingNewEntry && !entryModal.isReadOnly"
          type="button"
          class="btn btn-primary btn-sm"
          data-testid="add-entry-button"
          @click="startAdd()"
        >
          {{ t('entry.addNew') }}
        </button>
      </div>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
import { getErrorMessage } from '~~/shared/utils/errors'
import { formatAmount } from '~~/shared/utils/budget'
import { useModalsStore } from '~/stores/modals'
import { useBudgetStore } from '~/stores/budget'
import type { BudgetEntry } from '~~/shared/types/budget'
import type { ConfirmationModalMessage } from '~/components/ui/ConfirmationModal.vue'

const modalsStore = useModalsStore()
const budgetStore = useBudgetStore()
const { t } = useI18n()
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
  getEntryDate,
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
  if (entryModal.value.isReadOnly) return

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
  if (isAdding.value) return

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
    toast({ type: 'error', message: getErrorMessage(error, t('entry.errors.addFailed')) })
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
  if (isDeleting.value) return

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
    toast({ type: 'error', message: getErrorMessage(error, t('entry.errors.deleteFailed')) })
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

watch(() => entryModal.value.isOpen, (isOpen) => {
  if (isOpen) {
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
  if (isSaving.value) return

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
    toast({ type: 'error', message: getErrorMessage(error, t('entry.errors.updateFailed')) })
  }
  finally {
    isSaving.value = false
  }
}
</script>
