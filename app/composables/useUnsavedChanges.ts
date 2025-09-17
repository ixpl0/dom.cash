export const useUnsavedChanges = () => {
  const { confirm } = useConfirmation()
  const hasUnsavedChanges = ref(false)

  const markAsChanged = (): void => {
    hasUnsavedChanges.value = true
  }

  const markAsSaved = (): void => {
    hasUnsavedChanges.value = false
  }

  const confirmClose = async (message = 'У вас есть несохранённые изменения. Вы уверены, что хотите закрыть?'): Promise<boolean> => {
    if (!hasUnsavedChanges.value) {
      return true
    }

    return await confirm({
      title: 'Несохранённые изменения',
      message,
      variant: 'warning',
      confirmText: 'Закрыть без сохранения',
      cancelText: 'Отмена',
    })
  }

  return {
    hasUnsavedChanges: readonly(hasUnsavedChanges),
    markAsChanged,
    markAsSaved,
    confirmClose,
  }
}
