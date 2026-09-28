import type {
  CreateDocDocumentPayload,
  CreateDocFolderPayload,
  DocDocument,
  DocFolderDetails,
  DocFolderSummary,
  DocFoldersData,
  DocImageUploadResult,
  DocParticipant,
  DocRecognitionResult,
  RecognizeDocDocumentPayload,
  UpdateDocDocumentPayload,
  UpdateDocFolderPayload,
  UploadDocImageQuery,
} from '~~/shared/types/docs'
import { DOC_FILE_NAME_MAX_LENGTH, DOC_IMAGE_MAX_SIZE, DOC_MAX_RECOGNITION_IMAGES } from '~~/shared/schemas/docs'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import { createDocImageVariants, IMAGE_UNREADABLE_ERROR } from '~/utils/doc-images'
import { readServerErrorKey } from '~/utils/server-error'

interface LoadError {
  message: string
}

interface FolderLoadError extends LoadError {
  folderId: string
}

export interface DocActivity {
  uploadTotal: number
  uploadDone: number
  isRecognizing: boolean
}

interface UploadOptions {
  recognize: boolean
}

const UPLOAD_CONTENT_TYPE = 'application/octet-stream'
const IMAGE_TOO_LARGE_ERROR = 'image-too-large'
const BYTES_IN_MEGABYTE = 1024 * 1024
const IDLE_ACTIVITY: DocActivity = { uploadTotal: 0, uploadDone: 0, isRecognizing: false }

const toLoadError = (error: unknown): LoadError => ({ message: readServerErrorKey(error) ?? '' })

const isFolderGoneError = (error: unknown): boolean => {
  const errorKey = readServerErrorKey(error)
  return errorKey === ERROR_KEYS.DOCS_FOLDER_NOT_FOUND || errorKey === ERROR_KEYS.DOCS_NO_ACCESS
}

type Translate = ReturnType<typeof useT>

const readErrorMessage = (error: unknown): string | null => error instanceof Error ? error.message : null

const formatError = (t: Translate, error: unknown, fallback: string): string => {
  const errorKey = readServerErrorKey(error)
  return errorKey ? t(errorKey) : fallback
}

const describeUploadError = (t: Translate, error: unknown): string => {
  const errorMessage = readErrorMessage(error)

  if (errorMessage === IMAGE_UNREADABLE_ERROR) {
    return t('docs.upload.unreadable')
  }
  if (errorMessage === IMAGE_TOO_LARGE_ERROR) {
    return t('docs.upload.tooLarge', { size: DOC_IMAGE_MAX_SIZE / BYTES_IN_MEGABYTE })
  }
  return formatError(t, error, t('docs.errors.uploadFailed'))
}

const getFolderPath = (folderId: string): string => `/api/docs/folders/${encodeURIComponent(folderId)}`

const getDocumentPath = (documentId: string): string => `/api/docs/documents/${encodeURIComponent(documentId)}`

export const useDocsStore = defineStore('docs', () => {
  const folders = ref<DocFolderSummary[] | null>(null)
  const foldersError = ref<LoadError | null>(null)
  const isLoadingFolders = ref(false)
  const details = ref<DocFolderDetails | null>(null)
  const detailsError = ref<FolderLoadError | null>(null)
  const isLoadingDetails = ref(false)
  const requestedFolderId = ref<string | null>(null)
  const connections = ref<DocParticipant[]>([])
  const activities = ref<Record<string, DocActivity>>({})
  const isStale = ref(false)
  const lastLoadAt = ref<number | null>(null)

  const getDocument = (documentId: string): DocDocument | null =>
    details.value?.documents.find(document => document.id === documentId) ?? null

  const getActivity = (documentId: string): DocActivity | null => activities.value[documentId] ?? null

  const isBusy = (documentId: string): boolean => getActivity(documentId) !== null

  const setActivity = (documentId: string, activity: DocActivity | null): void => {
    activities.value = activity
      ? { ...activities.value, [documentId]: activity }
      : Object.fromEntries(Object.entries(activities.value).filter(([id]) => id !== documentId))
  }

  const loadFolders = async (): Promise<void> => {
    const requestFetch = useRequestFetch()
    isLoadingFolders.value = folders.value === null

    try {
      const [foldersData, connectionsData] = await Promise.all([
        requestFetch<DocFoldersData>('/api/docs/folders'),
        requestFetch<DocParticipant[]>('/api/docs/connections'),
      ])

      folders.value = foldersData.folders
      connections.value = connectionsData
      foldersError.value = null
      isStale.value = false
    }
    catch (error) {
      if (!folders.value) {
        foldersError.value = toLoadError(error)
      }
    }
    finally {
      isLoadingFolders.value = false
      lastLoadAt.value = Date.now()
    }
  }

  const loadFolder = async (folderId: string): Promise<void> => {
    const requestFetch = useRequestFetch()
    const hasFolder = details.value?.folder.id === folderId
    requestedFolderId.value = folderId

    if (!hasFolder) {
      details.value = null
      detailsError.value = null
    }
    isLoadingDetails.value = !hasFolder

    try {
      const [detailsData, connectionsData] = await Promise.all([
        requestFetch<DocFolderDetails>(getFolderPath(folderId)),
        requestFetch<DocParticipant[]>('/api/docs/connections'),
      ])

      if (requestedFolderId.value === folderId) {
        details.value = detailsData
        connections.value = connectionsData
        detailsError.value = null
        isStale.value = false
      }
    }
    catch (error) {
      if (requestedFolderId.value === folderId && (!hasFolder || isFolderGoneError(error))) {
        details.value = null
        detailsError.value = { folderId, ...toLoadError(error) }
      }
    }
    finally {
      if (requestedFolderId.value === folderId) {
        isLoadingDetails.value = false
      }
      lastLoadAt.value = Date.now()
    }
  }

  const markStale = (): void => {
    if (folders.value || details.value) {
      isStale.value = true
    }
  }

  const refreshIfStale = async (): Promise<void> => {
    if (!isStale.value) {
      return
    }
    isStale.value = false
    const shownFolderId = details.value?.folder.id

    await Promise.all([
      folders.value ? loadFolders() : Promise.resolve(),
      shownFolderId ? loadFolder(shownFolderId) : Promise.resolve(),
    ])
  }

  const setFolderTitles = (folderId: string, documentTitles: string[]): void => {
    if (folders.value) {
      folders.value = folders.value.map(folder => folder.id === folderId ? { ...folder, documentTitles } : folder)
    }
  }

  const setDocuments = (documents: DocDocument[]): void => {
    if (!details.value) {
      return
    }
    const documentTitles = documents.map(({ title }) => title)
    details.value = { ...details.value, documents, folder: { ...details.value.folder, documentTitles } }
    setFolderTitles(details.value.folder.id, documentTitles)
  }

  const putDocument = (document: DocDocument): void => {
    if (details.value?.folder.id !== document.folderId) {
      return
    }
    const hasDocument = details.value.documents.some(({ id }) => id === document.id)
    setDocuments(hasDocument
      ? details.value.documents.map(item => item.id === document.id ? document : item)
      : [...details.value.documents, document])
  }

  const putFolder = (folder: DocFolderSummary): void => {
    if (folders.value) {
      const hasFolder = folders.value.some(({ id }) => id === folder.id)
      folders.value = hasFolder
        ? folders.value.map(item => item.id === folder.id ? folder : item)
        : [...folders.value, folder]
    }
    if (details.value?.folder.id === folder.id) {
      details.value = { ...details.value, folder }
    }
  }

  const createFolder = async (payload: CreateDocFolderPayload): Promise<DocFolderSummary> => {
    const folder = await $fetch<DocFolderSummary>('/api/docs/folders', { method: 'POST', body: payload })
    putFolder(folder)
    return folder
  }

  const updateFolder = async (folderId: string, payload: UpdateDocFolderPayload): Promise<DocFolderSummary> => {
    const folder = await $fetch<DocFolderSummary>(getFolderPath(folderId), { method: 'PUT', body: payload })
    putFolder(folder)
    return folder
  }

  const deleteFolder = async (folderId: string): Promise<void> => {
    await $fetch(getFolderPath(folderId), { method: 'DELETE' })
    if (folders.value) {
      folders.value = folders.value.filter(folder => folder.id !== folderId)
    }
    if (details.value?.folder.id === folderId) {
      details.value = null
    }
  }

  const createDocument = async (folderId: string, payload: CreateDocDocumentPayload): Promise<DocDocument> => {
    const document = await $fetch<DocDocument>(`${getFolderPath(folderId)}/documents`, { method: 'POST', body: payload })
    putDocument(document)
    return document
  }

  const updateDocument = async (documentId: string, payload: UpdateDocDocumentPayload): Promise<DocDocument> => {
    const document = await $fetch<DocDocument>(getDocumentPath(documentId), { method: 'PUT', body: payload })
    putDocument(document)
    return document
  }

  const deleteDocument = async (documentId: string): Promise<void> => {
    await $fetch(getDocumentPath(documentId), { method: 'DELETE' })
    if (details.value) {
      setDocuments(details.value.documents.filter(document => document.id !== documentId))
    }
  }

  const deleteImage = async (imageId: string): Promise<DocDocument> => {
    const document = await $fetch<DocDocument>(`/api/docs/images/${encodeURIComponent(imageId)}`, { method: 'DELETE' })
    putDocument(document)
    return document
  }

  const reorderImages = async (documentId: string, imageIds: string[]): Promise<DocDocument> => {
    const document = await $fetch<DocDocument>(`${getDocumentPath(documentId)}/images/order`, { method: 'PUT', body: { imageIds } })
    putDocument(document)
    return document
  }

  const recognizeDocument = async (documentId: string, payload: RecognizeDocDocumentPayload): Promise<DocRecognitionResult | null> => {
    const t = useT()
    const { toast } = useToast()
    setActivity(documentId, { ...(getActivity(documentId) ?? IDLE_ACTIVITY), isRecognizing: true })

    try {
      const result = await $fetch<DocRecognitionResult>(`${getDocumentPath(documentId)}/recognize`, { method: 'POST', body: payload })
      putDocument(result.document)
      toast(result.addedFieldCount > 0
        ? { type: 'success', message: t('docs.recognition.added', { count: result.addedFieldCount }, result.addedFieldCount) }
        : { type: 'info', message: t('docs.recognition.noNewFields') })
      return result
    }
    catch (error) {
      toast({ type: 'error', message: formatError(t, error, t('docs.recognition.failed')) })
      return null
    }
    finally {
      const activity = getActivity(documentId)
      setActivity(documentId, activity && activity.uploadDone < activity.uploadTotal ? { ...activity, isRecognizing: false } : null)
    }
  }

  const uploadImage = async (documentId: string, file: File): Promise<string> => {
    if (file.size > DOC_IMAGE_MAX_SIZE) {
      throw new Error(IMAGE_TOO_LARGE_ERROR)
    }

    const variants = await createDocImageVariants(file)
    const query: UploadDocImageQuery = {
      fileName: file.name.slice(0, DOC_FILE_NAME_MAX_LENGTH),
      originalSize: file.size,
      previewSize: variants.preview.size,
      thumbnailSize: variants.thumbnail.size,
      width: variants.width,
      height: variants.height,
    }

    const result = await $fetch<DocImageUploadResult>(`${getDocumentPath(documentId)}/images`, {
      method: 'POST',
      query,
      body: new Blob([file, variants.preview, variants.thumbnail], { type: UPLOAD_CONTENT_TYPE }),
      headers: { 'content-type': UPLOAD_CONTENT_TYPE },
    })

    putDocument(result.document)
    return result.imageId
  }

  const uploadImages = async (documentId: string, files: readonly File[], { recognize }: UploadOptions): Promise<void> => {
    const t = useT()
    const { toast } = useToast()
    setActivity(documentId, { uploadTotal: files.length, uploadDone: 0, isRecognizing: false })

    const uploadedImageIds = await files.reduce<Promise<string[]>>(async (previousImageIds, file, index) => {
      const imageIds = await previousImageIds

      try {
        return [...imageIds, await uploadImage(documentId, file)]
      }
      catch (error) {
        toast({ type: 'error', message: t('docs.upload.failed', { fileName: file.name, reason: describeUploadError(t, error) }) })
        return imageIds
      }
      finally {
        setActivity(documentId, { uploadTotal: files.length, uploadDone: index + 1, isRecognizing: false })
      }
    }, Promise.resolve([]))

    if (recognize && uploadedImageIds.length > 0) {
      await recognizeDocument(documentId, { mode: 'merge', imageIds: uploadedImageIds.slice(0, DOC_MAX_RECOGNITION_IMAGES) })
    }

    setActivity(documentId, null)
  }

  return {
    folders,
    foldersError,
    isLoadingFolders,
    details,
    detailsError,
    isLoadingDetails,
    connections,
    activities,
    isStale,
    lastLoadAt,
    getDocument,
    getActivity,
    isBusy,
    loadFolders,
    loadFolder,
    markStale,
    refreshIfStale,
    createFolder,
    updateFolder,
    deleteFolder,
    createDocument,
    updateDocument,
    deleteDocument,
    deleteImage,
    reorderImages,
    recognizeDocument,
    uploadImages,
  }
})
