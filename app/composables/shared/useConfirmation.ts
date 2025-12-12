import type { ConfirmationModalOptions } from '~/components/ui/ConfirmationModal.vue'

interface ConfirmationState {
  isOpen: boolean
  options: ConfirmationModalOptions
  resolve: ((value: boolean) => void) | null
}

const confirmationState = ref<ConfirmationState>({
  isOpen: false,
  options: { message: '' },
  resolve: null,
})

export const useConfirmation = () => {
  const confirm = (options: ConfirmationModalOptions | string): Promise<boolean> => {
    const normalizedOptions: ConfirmationModalOptions = typeof options === 'string'
      ? { message: options }
      : options

    return new Promise((resolve) => {
      confirmationState.value = {
        isOpen: true,
        options: normalizedOptions,
        resolve,
      }
    })
  }

  const handleConfirm = (): void => {
    const { resolve, options } = confirmationState.value
    confirmationState.value = {
      isOpen: false,
      options,
      resolve: null,
    }
    resolve?.(true)

    // Reset options after animation completes
    setTimeout(() => {
      if (!confirmationState.value.isOpen) {
        confirmationState.value.options = { message: '' }
      }
    }, 300)
  }

  const handleCancel = (): void => {
    const { resolve, options } = confirmationState.value
    confirmationState.value = {
      isOpen: false,
      options,
      resolve: null,
    }
    resolve?.(false)

    // Reset options after animation completes
    setTimeout(() => {
      if (!confirmationState.value.isOpen) {
        confirmationState.value.options = { message: '' }
      }
    }, 300)
  }

  return {
    confirmationState: readonly(confirmationState),
    confirm,
    handleConfirm,
    handleCancel,
  }
}
