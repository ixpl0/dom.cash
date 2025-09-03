<template>
  <tr>
    <td>
      <input
        v-model="localEntry.description"
        type="text"
        :placeholder="isNew ? 'Введите описание...' : undefined"
        class="input input-bordered w-full"
        @keyup.enter="$emit('save')"
        @keyup.esc="$emit('cancel')"
      >
    </td>
    <td>
      <input
        v-model.number="localEntry.amount"
        type="number"
        min="0"
        step="0.01"
        :placeholder="isNew ? '0.00' : undefined"
        class="input input-bordered w-full"
        @keyup.enter="$emit('save')"
        @keyup.esc="$emit('cancel')"
      >
    </td>
    <td>
      <UiCurrencyPicker
        v-model="localEntry.currency"
        class="w-full min-w-[240px]"
      />
    </td>
    <td v-if="entryKind !== 'balance'">
      <input
        v-model="localEntry.date"
        type="date"
        class="input input-bordered"
        @keyup.enter="$emit('save')"
        @keyup.esc="$emit('cancel')"
      >
    </td>
    <td v-if="entryKind === 'expense'">
      <input
        v-model="localEntry.isOptional"
        type="checkbox"
        class="checkbox checkbox-sm"
      >
    </td>
    <td class="w-1">
      <div class="flex gap-2">
        <button
          type="button"
          class="btn btn-sm btn-success"
          :disabled="isSaving"
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
import type { EntryFormData } from '~/composables/useEntryForm'

const props = defineProps<{
  modelValue: EntryFormData
  entryKind: 'balance' | 'income' | 'expense'
  isSaving: boolean
  isNew?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: EntryFormData]
  'save': []
  'cancel': []
}>()

const localEntry = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
</script>
