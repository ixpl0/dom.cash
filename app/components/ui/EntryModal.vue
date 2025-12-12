<template>
  <UiDialog
    :is-open="isOpen"
    data-testid="entry-modal"
    content-class="modal-box w-[calc(100vw-2rem)] max-w-5xl max-h-[90vh] flex flex-col overflow-visible"
    @close="$emit('close')"
  >
    <button
      type="button"
      class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
      data-testid="modal-close-button"
      @click="$emit('close')"
    >
      <Icon
        name="heroicons:x-mark"
        size="20"
      />
    </button>

    <h3 class="font-bold text-lg mb-4 flex-shrink-0">
      {{ title }}<template v-if="totalAmount">
        : {{ totalAmount }}
      </template>
    </h3>

    <div class="space-y-4 flex-1 overflow-y-auto overflow-x-auto min-h-0">
      <div
        v-if="entries.length || isAddingNewEntry"
        class="min-w-[600px]"
      >
        <table class="table text-center">
          <thead>
            <tr>
              <th>{{ descriptionLabel }}</th>
              <th>{{ amountLabel }}</th>
              <th>{{ currencyLabel }}</th>
              <th v-if="entryKind !== 'balance'">
                {{ dateLabel }}
              </th>
              <th v-if="entryKind === 'expense'">
                {{ optionalLabel }}
              </th>
              <th class="w-1">
                {{ actionsLabel }}
              </th>
            </tr>
          </thead>
          <tbody>
            <template
              v-for="entry in entries"
              :key="entry.id"
            >
              <UiEntryEditRow
                v-if="editingEntryId === entry.id"
                :model-value="editingEntry"
                :entry-kind="entryKind"
                :is-saving="isSaving"
                :description-placeholder="descriptionPlaceholder"
                :amount-placeholder="amountPlaceholder"
                @update:model-value="$emit('update:editingEntry', $event)"
                @save="$emit('saveEdit')"
                @cancel="$emit('cancelEdit')"
              />
              <tr
                v-else
                data-testid="entry-row"
              >
                <td
                  :class="{ 'cursor-pointer hover:bg-base-200': !isReadOnly }"
                  @click="handleCellClick(entry, 'description')"
                >
                  <span>{{ entry.description }}</span>
                </td>
                <td
                  class="p-0"
                  :class="{ 'cursor-pointer hover:bg-base-200': !isReadOnly }"
                  @click="handleCellClick(entry, 'amount')"
                >
                  <div
                    :class="[
                      'w-full h-full px-4 py-3',
                      props.getAmountTooltip?.(entry) ? 'tooltip tooltip-top' : '',
                    ]"
                    :data-tip="props.getAmountTooltip?.(entry)"
                  >
                    <span
                      :class="{
                        'text-success': entryKind === 'income' && entry.amount > 0,
                        'text-error': entryKind === 'expense' && entry.amount > 0,
                        'text-primary': entryKind === 'balance' && entry.amount > 0,
                        'text-base-content': entry.amount === 0,
                        'text-warning': entry.amount < 0,
                      }"
                    >{{ formatAmount(entry.amount, entry.currency) }}</span>
                  </div>
                </td>
                <td
                  :class="{ 'cursor-pointer hover:bg-base-200': !isReadOnly }"
                  @click="handleCellClick(entry, 'currency')"
                >
                  <span>{{ entry.currency }}</span>
                </td>
                <td
                  v-if="entryKind !== 'balance'"
                  :class="{ 'cursor-pointer hover:bg-base-200': !isReadOnly }"
                  @click="handleCellClick(entry, 'date')"
                >
                  <span>{{ formatEntryDate(entry) }}</span>
                </td>
                <td
                  v-if="entryKind === 'expense'"
                  :class="{ 'cursor-pointer hover:bg-base-200': !isReadOnly }"
                  @click="handleCellClick(entry, 'optional')"
                >
                  <Icon
                    v-if="'isOptional' in entry && entry.isOptional"
                    name="heroicons:check"
                    size="20"
                    class="text-success inline-block"
                  />
                </td>
                <td class="w-1">
                  <div class="flex gap-2">
                    <button
                      v-if="!isReadOnly"
                      class="btn btn-sm btn-warning"
                      data-testid="entry-edit-button"
                      @click="$emit('startEdit', entry)"
                    >
                      <Icon
                        name="heroicons:pencil-square"
                        size="16"
                      />
                    </button>
                    <button
                      v-if="!isReadOnly"
                      class="btn btn-sm btn-error"
                      :disabled="deletingEntryId === entry.id"
                      @click="$emit('delete', entry.id)"
                    >
                      <span
                        v-if="deletingEntryId === entry.id"
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
            <UiEntryEditRow
              v-if="isAddingNewEntry"
              :model-value="newEntry"
              :entry-kind="entryKind"
              :is-saving="isAdding"
              :is-new="true"
              :description-placeholder="descriptionPlaceholder"
              :amount-placeholder="amountPlaceholder"
              @update:model-value="$emit('update:newEntry', $event)"
              @save="$emit('saveNew')"
              @cancel="$emit('cancelNew')"
            />
          </tbody>
        </table>

        <div class="flex justify-center mt-4">
          <button
            v-if="!isAddingNewEntry && !isReadOnly"
            class="btn btn-primary btn-sm"
            data-testid="add-entry-button"
            @click="$emit('startNew')"
          >
            {{ addButtonLabel }}
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
          data-testid="add-entry-button"
          @click="$emit('startNew')"
        >
          {{ addButtonLabel }}
        </button>
      </div>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
import { formatAmount } from '~~/shared/utils/budget/budget'
import type { BudgetEntry } from '~~/shared/types/budget'
import type { EntryFormData } from '~/composables/budget/useEntryForm'

export interface UiEntryModalProps {
  isOpen: boolean
  title: string
  entries: ReadonlyArray<BudgetEntry>
  entryKind: 'balance' | 'income' | 'expense'
  isReadOnly?: boolean
  emptyMessage: string
  editingEntryId: string | null
  editingEntry: EntryFormData
  newEntry: EntryFormData
  isAddingNewEntry: boolean
  isAdding: boolean
  isSaving: boolean
  deletingEntryId: string | null
  descriptionLabel: string
  amountLabel: string
  currencyLabel: string
  dateLabel: string
  optionalLabel: string
  actionsLabel: string
  addButtonLabel: string
  descriptionPlaceholder?: string
  amountPlaceholder?: string
  formatDate: (date: string | null | undefined) => string
  getAmountTooltip?: (entry: BudgetEntry) => string | undefined
  totalAmount?: string
}

const props = withDefaults(defineProps<UiEntryModalProps>(), {
  isReadOnly: false,
  descriptionPlaceholder: '',
  amountPlaceholder: '',
  getAmountTooltip: undefined,
  totalAmount: undefined,
})

const emit = defineEmits<{
  'close': []
  'startNew': []
  'saveNew': []
  'cancelNew': []
  'startEdit': [entry: BudgetEntry]
  'startEditWithFocus': [entry: BudgetEntry, field: string]
  'saveEdit': []
  'cancelEdit': []
  'delete': [entryId: string]
  'update:editingEntry': [value: EntryFormData]
  'update:newEntry': [value: EntryFormData]
}>()

const getEntryDate = (entry: BudgetEntry): string | null => {
  return 'date' in entry ? entry.date : null
}

const formatEntryDate = (entry: BudgetEntry): string => {
  return props.formatDate(getEntryDate(entry))
}

const handleCellClick = (entry: BudgetEntry, field: string): void => {
  if (props.isReadOnly) {
    return
  }
  emit('startEditWithFocus', entry, field)
}
</script>
