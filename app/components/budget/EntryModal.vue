<template>
  <dialog
    ref="modal"
    class="modal"
    @close="handleDialogClose"
  >
    <div class="modal-box w-11/12 max-w-2xl">
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
                  <th>Действия</th>
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
                      class="input input-sm input-bordered w-20"
                      @keyup.enter="saveEntry()"
                      @keyup.esc="cancelEdit()"
                    >
                    <span v-else>{{ formatAmount(entry.amount, entry.currency) }}</span>
                  </td>
                  <td>
                    <select
                      v-if="editingEntryId === entry.id"
                      v-model="editingEntry.currency"
                      class="select select-sm select-bordered"
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
                  <td>
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
                          class="btn btn-sm btn-warning"
                          @click="startEdit(entry)"
                        >
                          ✏️
                        </button>
                        <button
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
                      class="input input-sm input-bordered w-20"
                      @keyup.enter="addEntry()"
                      @keyup.esc="cancelAdd()"
                    >
                  </td>
                  <td>
                    <select
                      v-model="newEntry.currency"
                      class="select select-sm select-bordered"
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
                  <td>
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
              v-if="!isAddingNewEntry"
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
            v-if="!isAddingNewEntry"
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

interface Props {
  monthId: string
  entryKind: 'balance' | 'income' | 'expense'
  entries?: BudgetEntry[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  added: []
  deleted: [entryId: string]
  updated: [entryId: string]
}>()

const modal = ref<HTMLDialogElement>()
const isAdding = ref(false)
const isDeleting = ref<string | null>(null)
const editingEntryId = ref<string | null>(null)
const isSaving = ref(false)
const isAddingNewEntry = ref(false)
const editingEntry = ref({
  description: '',
  amount: 0,
  currency: 'RUB',
  date: '',
})

const newEntry = ref({
  description: '',
  amount: 0,
  currency: 'RUB',
  date: new Date().toISOString().split('T')[0],
})

const modalTitle = computed(() => {
  switch (props.entryKind) {
    case 'balance':
      return 'Источники баланса'
    case 'income':
      return 'Доходы'
    case 'expense':
      return 'Крупные расходы'
    default:
      return 'Записи'
  }
})

const emptyMessage = computed(() => {
  switch (props.entryKind) {
    case 'balance':
      return 'Пока нет источников баланса'
    case 'income':
      return 'Пока нет доходов'
    case 'expense':
      return 'Пока нет крупных расходов'
    default:
      return 'Пока нет записей'
  }
})

const formatDate = (date: string | null | undefined): string => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ru-RU')
}

const getEntryDate = (entry: BudgetEntry): string | null => {
  return 'date' in entry ? entry.date : null
}

const startAdd = (): void => {
  isAddingNewEntry.value = true
  newEntry.value = {
    description: '',
    amount: 0,
    currency: 'RUB',
    date: new Date().toISOString().split('T')[0],
  }
}

const cancelAdd = (): void => {
  isAddingNewEntry.value = false
  newEntry.value = {
    description: '',
    amount: 0,
    currency: 'RUB',
    date: new Date().toISOString().split('T')[0],
  }
}

const addEntry = async (): Promise<void> => {
  if (!newEntry.value.description.trim() || newEntry.value.amount <= 0) {
    return
  }

  isAdding.value = true

  try {
    const { addEntry: addEntryToStore } = useBudgetData()

    await addEntryToStore(
      props.monthId,
      props.entryKind,
      {
        description: newEntry.value.description,
        amount: newEntry.value.amount,
        currency: newEntry.value.currency,
        date: props.entryKind !== 'balance' ? newEntry.value.date : undefined,
      },
    )

    emit('added')

    isAddingNewEntry.value = false
    newEntry.value = {
      description: '',
      amount: 0,
      currency: 'RUB',
      date: new Date().toISOString().split('T')[0],
    }
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
    const { deleteEntry: deleteEntryFromStore } = useBudgetData()
    await deleteEntryFromStore(entryId)

    emit('deleted', entryId)
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
  editingEntry.value = {
    description: '',
    amount: 0,
    currency: 'RUB',
    date: '',
  }
}

const saveEntry = async (): Promise<void> => {
  if (!editingEntryId.value || !editingEntry.value.description.trim() || editingEntry.value.amount <= 0) {
    return
  }

  isSaving.value = true

  try {
    const { updateEntry: updateEntryInStore } = useBudgetData()

    await updateEntryInStore(editingEntryId.value, {
      description: editingEntry.value.description,
      amount: editingEntry.value.amount,
      currency: editingEntry.value.currency,
      date: props.entryKind !== 'balance' ? editingEntry.value.date : undefined,
    })

    emit('updated', editingEntryId.value)
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
