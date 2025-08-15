<template>
  <dialog
    ref="modal"
    class="modal"
    @close="handleDialogClose"
  >
    <div class="modal-box w-11/12 max-w-5xl">
      <button
        type="button"
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="hide()"
      >
        ✕
      </button>

      <h3 class="font-bold text-lg mb-4">
        {{ modalTitle }}
      </h3>

      <div class="space-y-4 mb-6">
        <div v-if="entries?.length || isAddingNewEntry">
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Описание</th>
                  <th>Сумма</th>
                  <th>Валюта</th>
                  <th v-if="entryKind !== 'balance'">
                    Дата
                  </th>
                  <th class="w-1">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="entry in (entries || [])"
                  :key="entry.id"
                >
                  <td>
                    <input
                      v-if="editingEntryId === entry.id"
                      v-model="editingEntry.description"
                      type="text"
                      class="input input-sm input-bordered w-full"
                      @keyup.enter="saveEntry()"
                      @keyup.esc="cancelEdit()"
                    >
                    <span v-else>{{ entry.description }}</span>
                  </td>
                  <td>
                    <input
                      v-if="editingEntryId === entry.id"
                      v-model.number="editingEntry.amount"
                      type="number"
                      min="0"
                      step="0.01"
                      class="input input-sm input-bordered w-full"
                      @keyup.enter="saveEntry()"
                      @keyup.esc="cancelEdit()"
                    >
                    <span v-else>{{ formatAmount(entry.amount, entry.currency) }}</span>
                  </td>
                  <td>
                    <select
                      v-if="editingEntryId === entry.id"
                      v-model="editingEntry.currency"
                      class="select select-sm select-bordered min-w-20"
                    >
                      <option value="RUB">
                        RUB
                      </option>
                      <option value="USD">
                        USD
                      </option>
                      <option value="EUR">
                        EUR
                      </option>
                    </select>
                    <span v-else>{{ entry.currency }}</span>
                  </td>
                  <td v-if="entryKind !== 'balance'">
                    <input
                      v-if="editingEntryId === entry.id"
                      v-model="editingEntry.date"
                      type="date"
                      class="input input-sm input-bordered"
                      @keyup.enter="saveEntry()"
                      @keyup.esc="cancelEdit()"
                    >
                    <span v-else>{{ formatDate(getEntryDate(entry)) }}</span>
                  </td>
                  <td class="w-1">
                    <div class="flex gap-2">
                      <template v-if="editingEntryId === entry.id">
                        <button
                          class="btn btn-sm btn-success"
                          :disabled="isSaving"
                          @click="saveEntry()"
                        >
                          <span
                            v-if="isSaving"
                            class="loading loading-spinner loading-xs"
                          />
                          <span v-else>✓</span>
                        </button>
                        <button
                          class="btn btn-sm btn-ghost"
                          @click="cancelEdit()"
                        >
                          ✕
                        </button>
                      </template>
                      <template v-else>
                        <button
                          v-if="!isReadOnly"
                          class="btn btn-sm btn-warning"
                          @click="startEdit(entry)"
                        >
                          ✏️
                        </button>
                        <button
                          v-if="!isReadOnly"
                          class="btn btn-sm btn-error"
                          :disabled="isDeleting === entry.id"
                          @click="deleteEntry(entry.id)"
                        >
                          <span
                            v-if="isDeleting === entry.id"
                            class="loading loading-spinner loading-xs"
                          />
                          <span v-else>🗑️</span>
                        </button>
                      </template>
                    </div>
                  </td>
                </tr>
                <tr v-if="isAddingNewEntry">
                  <td>
                    <input
                      v-model="newEntry.description"
                      type="text"
                      placeholder="Введите описание..."
                      class="input input-sm input-bordered w-full"
                      @keyup.enter="addEntry()"
                      @keyup.esc="cancelAdd()"
                    >
                  </td>
                  <td>
                    <input
                      v-model.number="newEntry.amount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      class="input input-sm input-bordered w-full"
                      @keyup.enter="addEntry()"
                      @keyup.esc="cancelAdd()"
                    >
                  </td>
                  <td>
                    <select
                      v-model="newEntry.currency"
                      class="select select-sm select-bordered min-w-20"
                    >
                      <option value="RUB">
                        RUB
                      </option>
                      <option value="USD">
                        USD
                      </option>
                      <option value="EUR">
                        EUR
                      </option>
                    </select>
                  </td>
                  <td v-if="entryKind !== 'balance'">
                    <input
                      v-model="newEntry.date"
                      type="date"
                      class="input input-sm input-bordered"
                      @keyup.enter="addEntry()"
                      @keyup.esc="cancelAdd()"
                    >
                  </td>
                  <td class="w-1">
                    <div class="flex gap-2">
                      <button
                        type="button"
                        class="btn btn-sm btn-success"
                        :disabled="isAdding"
                        @click="addEntry()"
                      >
                        <span
                          v-if="isAdding"
                          class="loading loading-spinner loading-xs"
                        />
                        <span v-else>✓</span>
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-ghost"
                        @click="cancelAdd()"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex justify-center mt-4">
            <button
              v-if="!isAddingNewEntry && !isReadOnly"
              class="btn btn-primary btn-sm"
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
            v-if="!isAddingNewEntry && !isReadOnly"
            type="button"
            class="btn btn-primary btn-sm"
            @click="startAdd()"
          >
            + Добавить новую запись
          </button>
        </div>
      </div>

      <div class="modal-action">
        <button
          type="button"
          class="btn"
          @click="hide()"
        >
          Закрыть
        </button>
      </div>
    </div>
    <div
      class="modal-backdrop"
      @click="handleBackdropClick"
    />
  </dialog>
</template>

<script setup lang="ts">
import type { BudgetEntry } from '~~/shared/types/budget'
import { formatAmount } from '~~/shared/utils/budget'
import { useEntryForm } from '~/composables/useEntryForm'
import { useBudgetOperations } from '~/composables/useBudgetOperations'

interface Props {
  monthId: string
  entryKind: 'balance' | 'income' | 'expense'
  entries?: BudgetEntry[]
  isReadOnly?: boolean
  targetUsername?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
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
} = useEntryForm(props.entryKind)

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

const {
  addEntry: performAddEntry,
  updateEntry: performUpdateEntry,
  deleteEntry: performDeleteEntry,
} = useBudgetOperations(props.monthId, props.entryKind, emitWrapper, props.targetUsername)

const addEntry = async (): Promise<void> => {
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

const show = (): void => {
  modal.value?.showModal()
}

const hide = (): void => {
  modal.value?.close()
}

const handleDialogClose = (): void => {
  emit('close')
}

const handleBackdropClick = (): void => {
  hide()
}

const saveEntry = async (): Promise<void> => {
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

defineExpose({
  show,
  hide,
})
</script>
