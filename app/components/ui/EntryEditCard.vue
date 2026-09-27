<template>
  <div class="flex flex-col gap-3 rounded-box bg-base-200 p-3">
    <label class="flex flex-col gap-1">
      <span class="label-text">{{ t('entry.description') }}</span>
      <input
        :value="modelValue.description"
        type="text"
        :placeholder="isNew ? t('entryEdit.descriptionPlaceholder') : undefined"
        class="input input-bordered w-full"
        data-testid="entry-description-input"
        @input="updateField('description', ($event.target as HTMLInputElement).value)"
        @keyup.enter="$emit('save')"
      >
    </label>

    <label class="flex flex-col gap-1">
      <span class="label-text">{{ t('entry.amount') }}</span>
      <input
        :value="modelValue.amount"
        type="number"
        min="0"
        step="0.01"
        :placeholder="isNew ? t('entryEdit.amountPlaceholder') : undefined"
        class="input input-bordered w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
        data-testid="entry-amount-input"
        @input="updateField('amount', parseFloat(($event.target as HTMLInputElement).value) || 0)"
        @keyup.enter="$emit('save')"
      >
    </label>

    <div class="flex flex-col gap-1">
      <span class="label-text">{{ t('entry.currency') }}</span>
      <UiCurrencyPicker
        :model-value="modelValue.currency"
        class="w-full"
        @update:model-value="updateField('currency', $event)"
      />
    </div>

    <label
      v-if="entryKind !== 'balance'"
      class="flex flex-col gap-1"
    >
      <span class="label-text">{{ t('entry.date') }}</span>
      <input
        :value="modelValue.date"
        type="date"
        class="input input-bordered w-full"
        @input="updateField('date', ($event.target as HTMLInputElement).value)"
        @keyup.enter="$emit('save')"
      >
    </label>

    <label
      v-if="entryKind === 'expense'"
      class="flex cursor-pointer items-center gap-2"
    >
      <input
        :checked="modelValue.isOptional"
        type="checkbox"
        class="checkbox checkbox-sm"
        data-testid="entry-optional-checkbox"
        @input="updateField('isOptional', ($event.target as HTMLInputElement).checked)"
      >
      <span class="label-text">{{ t('entry.optional') }}</span>
    </label>

    <div class="flex justify-end gap-2">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EntryKind } from '~~/shared/types'
import type { EntryFormData } from '~/composables/budget/useEntryForm'

interface Props {
  modelValue: EntryFormData
  entryKind: EntryKind
  isSaving: boolean
  isNew?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isNew: false,
})

const { t } = useI18n()

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
