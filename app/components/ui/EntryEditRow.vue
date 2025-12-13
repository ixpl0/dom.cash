<template>
  <tr>
    <td>
      <input
        :value="modelValue.description"
        type="text"
        :placeholder="isNew ? descriptionPlaceholder : undefined"
        class="input input-bordered w-full"
        data-testid="entry-description-input"
        @input="updateField('description', ($event.target as HTMLInputElement).value)"
        @keyup.enter="$emit('save')"
        @keyup.esc="$emit('cancel')"
      >
    </td>
    <td>
      <input
        :value="modelValue.amount"
        type="number"
        min="0"
        step="0.01"
        :placeholder="isNew ? amountPlaceholder : undefined"
        class="input input-bordered w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
        data-testid="entry-amount-input"
        @input="updateField('amount', parseFloat(($event.target as HTMLInputElement).value) || 0)"
        @keyup.enter="$emit('save')"
        @keyup.esc="$emit('cancel')"
      >
    </td>
    <td>
      <UiCurrencyPicker
        :model-value="modelValue.currency"
        class="w-full min-w-[240px]"
        @update:model-value="updateField('currency', $event)"
      />
    </td>
    <td v-if="entryKind !== 'balance'">
      <input
        :value="modelValue.date"
        type="date"
        class="input input-bordered"
        @input="updateField('date', ($event.target as HTMLInputElement).value)"
        @keyup.enter="$emit('save')"
        @keyup.esc="$emit('cancel')"
      >
    </td>
    <td v-if="entryKind === 'expense'">
      <input
        :checked="modelValue.isOptional"
        type="checkbox"
        class="checkbox checkbox-sm"
        data-testid="entry-optional-checkbox"
        @input="updateField('isOptional', ($event.target as HTMLInputElement).checked)"
      >
    </td>
    <td class="w-1">
      <div class="flex gap-2">
        <button
          type="button"
          class="btn btn-sm btn-success"
          :disabled="isSaving"
          data-testid="entry-save-button"
          @click="$emit('save')"
        >
          <span
            v-if="isSaving"
            class="loading loading-spinner loading-xs"
          />
          <Icon
            v-else
            name="heroicons:check"
            size="16"
          />
        </button>
        <button
          type="button"
          class="btn btn-sm btn-ghost"
          data-testid="entry-cancel-button"
          @click="$emit('cancel')"
        >
          <Icon
            name="heroicons:x-mark"
            size="16"
          />
        </button>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import type { EntryFormData } from '~/composables/budget/useEntryForm'

export interface UiEntryEditRowProps {
  modelValue: EntryFormData
  entryKind: 'balance' | 'income' | 'expense'
  isSaving: boolean
  isNew?: boolean
  descriptionPlaceholder?: string
  amountPlaceholder?: string
}

const props = withDefaults(defineProps<UiEntryEditRowProps>(), {
  isNew: false,
  descriptionPlaceholder: '',
  amountPlaceholder: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: EntryFormData]
  'save': []
  'cancel': []
}>()

const updateField = <K extends keyof EntryFormData>(field: K, value: EntryFormData[K]): void => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}
</script>
