<template>
  <div
    class="rounded-box bg-base-200 p-3"
    data-testid="entry-row"
  >
    <div class="flex items-start justify-between gap-3">
      <span
        class="min-w-0 flex-1 break-words font-medium"
        :class="{ 'cursor-pointer': !isReadOnly }"
        @click="handleFieldClick('description')"
      >{{ description }}</span>
      <span
        class="text-right"
        :class="{ 'cursor-pointer': !isReadOnly }"
        @click="handleFieldClick('amount')"
      >
        <span
          class="block whitespace-nowrap font-semibold"
          :class="amountClass"
        >{{ amountText }}</span>
        <span
          v-if="convertedAmountText"
          class="block whitespace-nowrap text-xs text-base-content/60"
        >≈ {{ convertedAmountText }}</span>
      </span>
    </div>

    <div class="mt-2 flex items-center justify-between gap-3">
      <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/70">
        <span
          :class="{ 'cursor-pointer': !isReadOnly }"
          @click="handleFieldClick('currency')"
        >{{ currency }}</span>
        <span
          v-if="dateText"
          :class="{ 'cursor-pointer': !isReadOnly }"
          @click="handleFieldClick('date')"
        >{{ dateText }}</span>
        <span
          v-if="showOptional && isOptional"
          class="inline-flex items-center gap-1 text-success"
          :class="{ 'cursor-pointer': !isReadOnly }"
          @click="handleFieldClick('optional')"
        >
          <Icon
            name="heroicons:check"
            size="16"
          />
          {{ optionalLabel }}
        </span>
      </div>

      <div
        v-if="!isReadOnly"
        class="flex flex-shrink-0 gap-2"
      >
        <button
          type="button"
          class="btn btn-sm btn-warning"
          data-testid="entry-edit-button"
          @click="$emit('edit')"
        >
          <Icon
            name="heroicons:pencil-square"
            size="16"
          />
        </button>
        <button
          type="button"
          class="btn btn-sm btn-error"
          :disabled="isDeleting"
          @click="$emit('delete')"
        >
          <span
            v-if="isDeleting"
            class="loading loading-spinner loading-xs"
          />
          <Icon
            v-else
            name="heroicons:trash"
            size="16"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  description: string
  amountText: string
  amountClass: string
  currency: string
  convertedAmountText?: string
  dateText?: string
  showOptional?: boolean
  isOptional?: boolean
  optionalLabel?: string
  isReadOnly?: boolean
  isDeleting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  convertedAmountText: '',
  dateText: '',
  showOptional: false,
  isOptional: false,
  optionalLabel: '',
  isReadOnly: false,
  isDeleting: false,
})

const emit = defineEmits<{
  edit: []
  delete: []
  fieldClick: [field: string]
}>()

const handleFieldClick = (field: string): void => {
  if (props.isReadOnly) {
    return
  }
  emit('fieldClick', field)
}
</script>
