<template>
  <UiDialog
    :is-open="isOpen"
    data-testid="confirmation-modal"
    content-class="modal-box w-11/12 max-w-md relative overflow-visible"
    :close-on-backdrop="false"
    :close-on-esc="false"
    :z-index="9999"
  >
    <div class="text-center">
      <div
        class="mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-6"
        :class="iconBgClass"
      >
        <Icon
          :name="iconName"
          size="32"
          :class="iconClass"
        />
      </div>

      <h3
        class="font-bold text-xl mb-4"
        :class="titleClass"
      >
        {{ title }}
      </h3>

      <div
        class="text-base-content/70 mb-8 leading-relaxed"
        v-html="message"
      />

      <div class="flex gap-3 justify-center">
        <button
          ref="cancelButton"
          type="button"
          class="btn btn-ghost min-w-24"
          data-testid="confirmation-cancel-button"
          @click="handleCancel"
        >
          {{ cancelText }}
        </button>
        <button
          ref="confirmButton"
          type="button"
          class="btn min-w-24"
          :class="confirmButtonClass"
          data-testid="confirmation-confirm-button"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
export interface ConfirmationModalOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  icon?: string
}

interface Props {
  isOpen: boolean
  options: ConfirmationModalOptions
}

const props = defineProps<Props>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const confirmButton = ref<HTMLButtonElement>()
const cancelButton = ref<HTMLButtonElement>()

const title = computed(() => props.options.title || getDefaultTitle())
const message = computed(() => props.options.message)
const confirmText = computed(() => props.options.confirmText || 'Подтвердить')
const cancelText = computed(() => props.options.cancelText || 'Отмена')
const variant = computed(() => props.options.variant || 'danger')

const getDefaultTitle = (): string => {
  switch (variant.value) {
    case 'danger': {
      return 'Подтверждение действия'
    }
    case 'warning': {
      return 'Внимание'
    }
    case 'info': {
      return 'Информация'
    }
    case 'success': {
      return 'Успех'
    }
    default: {
      return 'Подтверждение'
    }
  }
}

const iconName = computed(() => {
  if (props.options.icon) {
    return props.options.icon
  }

  switch (variant.value) {
    case 'danger': {
      return 'heroicons:exclamation-triangle'
    }
    case 'warning': {
      return 'heroicons:exclamation-triangle'
    }
    case 'info': {
      return 'heroicons:information-circle'
    }
    case 'success': {
      return 'heroicons:check-circle'
    }
    default: {
      return 'heroicons:question-mark-circle'
    }
  }
})

const iconBgClass = computed(() => {
  switch (variant.value) {
    case 'danger': {
      return 'bg-error/20'
    }
    case 'warning': {
      return 'bg-warning/20'
    }
    case 'info': {
      return 'bg-info/20'
    }
    case 'success': {
      return 'bg-success/20'
    }
    default: {
      return 'bg-base-300'
    }
  }
})

const iconClass = computed(() => {
  switch (variant.value) {
    case 'danger': {
      return 'text-error'
    }
    case 'warning': {
      return 'text-warning'
    }
    case 'info': {
      return 'text-info'
    }
    case 'success': {
      return 'text-success'
    }
    default: {
      return 'text-base-content'
    }
  }
})

const titleClass = computed(() => {
  switch (variant.value) {
    case 'danger': {
      return 'text-error'
    }
    case 'warning': {
      return 'text-warning'
    }
    case 'info': {
      return 'text-info'
    }
    case 'success': {
      return 'text-success'
    }
    default: {
      return 'text-base-content'
    }
  }
})

const confirmButtonClass = computed(() => {
  switch (variant.value) {
    case 'danger': {
      return 'btn-error'
    }
    case 'warning': {
      return 'btn-warning'
    }
    case 'info': {
      return 'btn-info'
    }
    case 'success': {
      return 'btn-success'
    }
    default: {
      return 'btn-primary'
    }
  }
})

const handleConfirm = (): void => {
  emit('confirm')
}

const handleCancel = (): void => {
  emit('cancel')
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (!props.isOpen) {
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    handleConfirm()
  }
  else if (event.key === 'Escape') {
    event.preventDefault()
    handleCancel()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    confirmButton.value?.focus()
  }
})
</script>
