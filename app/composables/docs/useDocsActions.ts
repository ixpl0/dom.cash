import type { DocDocument, DocFolderSummary } from '~~/shared/types/docs'
import { formatDocFieldsForCopy } from '~~/shared/utils/docs'
import { copyText } from '~/utils/clipboard'

export const useDocsActions = () => {
  const docsStore = useDocsStore()
  const { t } = useI18n()
  const { confirm } = useConfirmation()
  const { toast } = useToast()
  const { formatError } = useServerError()

  const runAction = async <T>(action: () => Promise<T>, fallback: string): Promise<{ value: T } | null> => {
    try {
      return { value: await action() }
    }
    catch (error) {
      toast({ type: 'error', message: formatError(error, fallback) })
      return null
    }
  }

  const getDocumentTitle = (title: string): string => title.trim() || t('docs.document.untitled')

  const deleteFolder = async ({ id, name }: Pick<DocFolderSummary, 'id' | 'name'>): Promise<boolean> => {
    const isConfirmed = await confirm({
      title: t('docs.folder.deleteTitle'),
      message: t('docs.folder.deleteMessage', { name }),
      variant: 'danger',
      confirmText: t('docs.folder.deleteConfirm'),
      icon: 'heroicons:trash',
    })

    return isConfirmed && (await runAction(() => docsStore.deleteFolder(id), t('docs.errors.deleteFailed'))) !== null
  }

  const deleteDocument = async ({ id, title }: Pick<DocDocument, 'id' | 'title'>): Promise<boolean> => {
    const isConfirmed = await confirm({
      title: t('docs.document.deleteTitle'),
      message: t('docs.document.deleteMessage', { name: getDocumentTitle(title) }),
      variant: 'danger',
      confirmText: t('docs.document.deleteConfirm'),
      icon: 'heroicons:trash',
    })

    return isConfirmed && (await runAction(() => docsStore.deleteDocument(id), t('docs.errors.deleteFailed'))) !== null
  }

  const deleteImage = async (imageId: string): Promise<boolean> => {
    const isConfirmed = await confirm({
      title: t('docs.document.removePhotoTitle'),
      message: t('docs.document.removePhotoMessage'),
      variant: 'danger',
      confirmText: t('docs.document.removePhotoConfirm'),
      icon: 'heroicons:trash',
    })

    return isConfirmed && (await runAction(() => docsStore.deleteImage(imageId), t('docs.errors.deleteFailed'))) !== null
  }

  const copyAllFields = async ({ title, fields }: Pick<DocDocument, 'title' | 'fields'>): Promise<void> => {
    const isCopied = await copyText(formatDocFieldsForCopy(getDocumentTitle(title), fields))
    toast(isCopied
      ? { type: 'success', message: t('docs.copy.allDone'), timeout: 2000 }
      : { type: 'error', message: t('docs.copy.failed') })
  }

  return {
    runAction,
    getDocumentTitle,
    deleteFolder,
    deleteDocument,
    deleteImage,
    copyAllFields,
  }
}
