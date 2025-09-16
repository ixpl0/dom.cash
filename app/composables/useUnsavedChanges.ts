export const useUnsavedChanges = () => {
  const hasUnsavedChanges = ref(false)

  const markAsChanged = (): void => {
    hasUnsavedChanges.value = true
  }

  const markAsSaved = (): void => {
    hasUnsavedChanges.value = false
  }

  const confirmClose = (message = 'У вас есть несохранённые изменения. Вы уверены, что хотите закрыть?'): boolean => {
    if (!hasUnsavedChanges.value) {
      return true
    }

    return confirm(message)
  }

  return {
    hasUnsavedChanges: readonly(hasUnsavedChanges),
    markAsChanged,
    markAsSaved,
    confirmClose,
  }
}
