<template>
  <dialog
    ref="modal"
    class="modal"
    data-testid="entry-modal"
    @close="handleDialogClose"
    @keydown.esc="handleEscapeKey"
  >
    <div class="modal-box w-11/12 max-w-5xl max-h-[90vh] flex flex-col overflow-visible">
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

      <div class="space-y-4 mb-6 flex-1 overflow-y-auto min-h-0">
        <div v-if="currentEntries.length || isAddingNewEntry">
          <table class="table text-center">
            <thead>
              <tr>
                <th>Описание</th>
                <th>Сумма</th>
                <th>Валюта</th>
                <th v-if="entryModal.entryKind !== 'balance'">
                  Дата
                </th>
                <th v-if="entryModal.entryKind === 'expense'">
                  Необязательное
                </th>
                <th class="w-1">
                  Действия
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
              + Добавить новую запись
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
            + Добавить новую запись
          </button>
        </div>
      </div>
    </div>
    <div
      class="modal-backdrop"
      @click="hide"
    />
  </dialog>
</template>

<script setup lang="ts">
import { formatAmount } from '~~/shared/utils/budget'
import { useModalsStore } from '~/stores/modals'
import { useBudgetStore } from '~/stores/budget'
import type { BudgetEntry } from '~~/shared/types/budget'

const modalsStore = useModalsStore()
const budgetStore = useBudgetStore()
const entryModal = computed(() => modalsStore.entryModal)

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

const modal = ref<HTMLDialogElement>()
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

const startEditWithFocus = (entry: BudgetEntry, fieldToFocus: string): void => {
  if (entryModal.value.isReadOnly) return

  focusField.value = fieldToFocus
  startEdit(entry)
}

const addEntry = async (): Promise<void> => {
  if (isAdding.value) return

  if (!newEntry.value.description.trim() || newEntry.value.amount <= 0) {
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
  }
  finally {
    isAdding.value = false
  }
}

const deleteEntry = async (entryId: string): Promise<void> => {
  if (isDeleting.value) return

  const entry = currentEntries.value.find(e => e.id === entryId)

  const entryType = entryModal.value.entryKind === 'balance'
    ? 'баланса'
    : entryModal.value.entryKind === 'income'
      ? 'дохода'
      : 'расхода'

  const confirmMessage = entry
    ? `Запись ${entryType}: <strong>"${entry.description}"</strong><br><strong>${formatAmount(entry.amount, entry.currency)}</strong>`
    : `Эта запись ${entryType}`

  const { confirm } = useConfirmation()
  const confirmed = await confirm({
    title: 'Удаление записи',
    message: confirmMessage,
    variant: 'danger',
    confirmText: 'Удалить',
    cancelText: 'Отмена',
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

const handleDialogClose = async (): Promise<void> => {
  if (!(await confirmClose())) {
    modal.value?.showModal()
    return
  }

  markAsSaved()
  modalsStore.closeEntryModal()
}

const handleEscapeKey = async (event: KeyboardEvent): Promise<void> => {
  event.preventDefault()
  await hide()
}

watch(() => entryModal.value.isOpen, (isOpen) => {
  if (isOpen) {
    modal.value?.showModal()
    resetForm()
    markAsSaved()
  }
  else {
    modal.value?.close()
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
        selector = '[data-testid="currency-select"]'
        break
    }

    if (selector && modal.value) {
      const element = modal.value.querySelector(selector) as HTMLInputElement

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

  if (!editingEntryId.value || !editingEntry.value.description.trim() || editingEntry.value.amount <= 0) {
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
  }
  finally {
    isSaving.value = false
  }
}
</script>
