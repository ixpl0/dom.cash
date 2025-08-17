import { ref, readonly } from 'vue'

export interface ToastMessage {
  id: string
  type?: 'info' | 'success' | 'warning' | 'error'
  message: string
  timeout?: number
}

const toasts = ref<ToastMessage[]>([])

export const useToast = () => {
  const addToast = (options: Omit<ToastMessage, 'id'>) => {
    const id = crypto.randomUUID()
    const newToast: ToastMessage = {
      id,
      type: options.type ?? 'warning',
      message: options.message,
      timeout: options.timeout ?? 7000,
    }

    toasts.value.push(newToast)

    const timeout = newToast.timeout
    if (timeout && timeout > 0) {
      setTimeout(() => {
        removeToast(id)
      }, timeout)
    }

    return id
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex((t: ToastMessage) => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const toast = (options: Omit<ToastMessage, 'id'>) => {
    return addToast(options)
  }

  const clearAllToasts = () => {
    toasts.value = []
  }

  return {
    toasts: readonly(toasts),
    toast,
    removeToast,
    clearAllToasts,
  }
}
