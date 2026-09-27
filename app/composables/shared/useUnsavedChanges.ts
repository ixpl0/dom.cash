export type DiscardChangesAction = 'close' | 'stopEditing'

export const useUnsavedChanges = () => {
  const { confirm } = useConfirmation()

  const confirmDiscardChanges = async (
    hasUnsavedChanges: boolean,
    action: DiscardChangesAction = 'close',
  ): Promise<boolean> => {
    if (!hasUnsavedChanges) {
      return true
    }

    const t = useT()
    const isClosing = action === 'close'

    return await confirm({
      title: t('unsavedChanges.title'),
      message: isClosing ? t('unsavedChanges.message') : t('unsavedChanges.stopEditingMessage'),
      variant: 'warning',
      confirmText: isClosing ? t('unsavedChanges.confirmText') : t('unsavedChanges.stopEditingConfirmText'),
      cancelText: t('common.cancel'),
    })
  }

  return {
    confirmDiscardChanges,
  }
}
