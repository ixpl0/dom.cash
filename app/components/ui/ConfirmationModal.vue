<template>
  <UiDialog
    :is-open="isOpen"
    data-testid="confirmation-modal"
    content-class="modal-box sm:max-w-md relative overflow-visible"
    :fullscreen-on-mobile="false"
    :close-on-backdrop="true"
    :z-index="9999"
    @close="handleCancel"
  >
    <div class="text-center">
      <div
        class="mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-6"
        :class="variantStyle.iconBackgroundClass"
      >
        <Icon
          :name="iconName"
          size="32"
          :class="variantStyle.textClass"
        />
      </div>

      <h3
        class="font-bold text-xl mb-4"
        :class="variantStyle.textClass"
      >
        {{ title }}
      </h3>

      <div
        v-if="typeof options.message === 'string'"
        class="text-base-content/70 mb-8 leading-relaxed"
      >
        {{ options.message }}
      </div>
      <div
        v-else
        class="text-base-content/70 mb-8 leading-relaxed"
      >
        <template
          v-for="(item, index) in options.message"
          :key="index"
        >
          <span v-if="typeof item === 'string'">
            {{ item }}
          </span>
          <span v-else-if="'text' in item && !item.isBold">
            {{ item.text }}
          </span>
          <b v-else-if="'text' in item && item.isBold">
            {{ item.text }}
          </b>
          <br v-else-if="'isDivider' in item && item.isDivider">
          {{ ' ' }}
        </template>
      </div>

      <div class="flex gap-3 justify-center flex-wrap">
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
          :class="variantStyle.buttonClass"
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
export interface ConfirmationModalMessageItem {
  text: string
  isBold?: boolean
}

export interface ConfirmationModalMessageDivider {
  isDivider: true
}

export type ConfirmationModalMessage = Array<ConfirmationModalMessageItem | ConfirmationModalMessageDivider | string>

export interface ConfirmationModalOptions {
  title?: string
  message: string | ConfirmationModalMessage
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

type ConfirmationVariant = NonNullable<ConfirmationModalOptions['variant']>

interface VariantStyle {
  titleKey: string
  icon: string
  iconBackgroundClass: string
  textClass: string
  buttonClass: string
}

const VARIANT_STYLES: Record<ConfirmationVariant, VariantStyle> = {
  danger: {
    titleKey: 'confirmation.titleDanger',
    icon: 'heroicons:exclamation-triangle',
    iconBackgroundClass: 'bg-error/20',
    textClass: 'text-error',
    buttonClass: 'btn-error',
  },
  warning: {
    titleKey: 'confirmation.titleWarning',
    icon: 'heroicons:exclamation-triangle',
    iconBackgroundClass: 'bg-warning/20',
    textClass: 'text-warning',
    buttonClass: 'btn-warning',
  },
  info: {
    titleKey: 'confirmation.titleInfo',
    icon: 'heroicons:information-circle',
    iconBackgroundClass: 'bg-info/20',
    textClass: 'text-info',
    buttonClass: 'btn-info',
  },
  success: {
    titleKey: 'confirmation.titleSuccess',
    icon: 'heroicons:check-circle',
    iconBackgroundClass: 'bg-success/20',
    textClass: 'text-success',
    buttonClass: 'btn-success',
  },
}

const confirmButton = ref<HTMLButtonElement>()
const cancelButton = ref<HTMLButtonElement>()
const { t } = useI18n()

const variantStyle = computed(() => VARIANT_STYLES[props.options.variant ?? 'danger'])
const title = computed(() => props.options.title || t(variantStyle.value.titleKey))
const iconName = computed(() => props.options.icon || variantStyle.value.icon)
const confirmText = computed(() => props.options.confirmText || t('confirmation.confirm'))
const cancelText = computed(() => props.options.cancelText || t('confirmation.cancel'))

const handleConfirm = (): void => {
  emit('confirm')
}

const handleCancel = (): void => {
  emit('cancel')
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (!props.isOpen || event.key !== 'Enter') {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  if (event.target === cancelButton.value) {
    handleCancel()
    return
  }

  handleConfirm()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown, { capture: true })
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown, { capture: true })
})

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    confirmButton.value?.focus()
  }
})
</script>
