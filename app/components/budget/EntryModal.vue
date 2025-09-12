<template>
  <dialog
    ref="modal"
    class="modal"
    data-testid="entry-modal"
    @close="handleDialogClose"
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
          <table class="table table-zebra text-center">
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
                <tr v-else>
                  <td>
                    <span>{{ entry.description }}</span>
                  </td>
                  <td>
                    <span
                      :class="{
                        'text-base-content': entry.amount === 0,
                        'text-success': entryModal.entryKind === 'income' || (entryModal.entryKind === 'balance' && entry.amount > 0),
                        'text-error': entryModal.entryKind === 'expense',
                        'text-warning': entryModal.entryKind === 'balance' && entry.amount < 0,
                      }"
                    >{{ formatAmount(entry.amount, entry.currency) }}</span>
                  </td>
                  <td>
                    <span>{{ entry.currency }}</span>
                  </td>
                  <td v-if="entryModal.entryKind !== 'balance'">
                    <span>{{ formatDate(getEntryDate(entry)) }}</span>
                  </td>
                  <td v-if="entryModal.entryKind === 'expense'">
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
import { useEntryForm } from '~/composables/useEntryForm'
import { useModalsStore } from '~/stores/modals'
import { useBudgetStore } from '~/stores/budget'

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

const addEntry = async (): Promise<void> => {
  if (isAdding.value) return

  if (!newEntry.value.description.trim() || newEntry.value.amount <= 0) {
    return
  }

  isAdding.value = true

  try {
    await performAddEntry(newEntry.value)
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
    ? `Вы уверены, что хотите удалить запись ${entryType}: "${entry.description}" ${entry.amount} ${entry.currency}?`
    : `Вы уверены, что хотите удалить эту запись ${entryType}?`

  if (!confirm(confirmMessage)) {
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

const hide = (): void => {
  modalsStore.closeEntryModal()
}

const handleDialogClose = (): void => {
  modalsStore.closeEntryModal()
}

watch(() => entryModal.value.isOpen, (isOpen) => {
  if (isOpen) {
    modal.value?.showModal()
  }
  else {
    modal.value?.close()
  }
})

const saveEntry = async (): Promise<void> => {
  if (isSaving.value) return

  if (!editingEntryId.value || !editingEntry.value.description.trim() || editingEntry.value.amount <= 0) {
    return
  }

  isSaving.value = true

  try {
    await performUpdateEntry(editingEntryId.value, editingEntry.value)
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
