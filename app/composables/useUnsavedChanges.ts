export const useUnsavedChanges = () => {
  const { confirm } = useConfirmation()
  const hasUnsavedChanges = ref(false)

  const markAsChanged = (): void => {
    hasUnsavedChanges.value = true
  }

  const markAsSaved = (): void => {
    hasUnsavedChanges.value = false
  }

  const confirmClose = async (message?: string): Promise<boolean> => {
    if (!hasUnsavedChanges.value) {
      return true
    }

    const t = useT()

    return await confirm({
      title: t('unsavedChanges.title'),
      message: message || t('unsavedChanges.message'),
      variant: 'warning',
      confirmText: t('unsavedChanges.confirmText'),
      cancelText: t('common.cancel'),
    })
  }

  return {
    hasUnsavedChanges: readonly(hasUnsavedChanges),
    markAsChanged,
    markAsSaved,
    confirmClose,
  }
}
