interface FolderModalState {
  isOpen: boolean
  editingFolderId: string | null
}

interface DocumentModalState {
  isOpen: boolean
  folderId: string | null
}

interface PhotosModalState {
  isOpen: boolean
  documentId: string | null
}

interface PhotoViewerState {
  isOpen: boolean
  documentId: string | null
  imageId: string | null
}

export const useDocsModalsStore = defineStore('docsModals', () => {
  const folderModal = ref<FolderModalState>({ isOpen: false, editingFolderId: null })
  const documentModal = ref<DocumentModalState>({ isOpen: false, folderId: null })
  const photosModal = ref<PhotosModalState>({ isOpen: false, documentId: null })
  const photoViewer = ref<PhotoViewerState>({ isOpen: false, documentId: null, imageId: null })

  const openFolderModal = (folderId?: string): void => {
    folderModal.value = { isOpen: true, editingFolderId: folderId ?? null }
  }

  const closeFolderModal = (): void => {
    folderModal.value = { isOpen: false, editingFolderId: null }
  }

  const openDocumentModal = (folderId: string): void => {
    documentModal.value = { isOpen: true, folderId }
  }

  const closeDocumentModal = (): void => {
    documentModal.value = { isOpen: false, folderId: null }
  }

  const openPhotosModal = (documentId: string): void => {
    photosModal.value = { isOpen: true, documentId }
  }

  const closePhotosModal = (): void => {
    photosModal.value = { isOpen: false, documentId: null }
  }

  const openPhotoViewer = (documentId: string, imageId: string): void => {
    photoViewer.value = { isOpen: true, documentId, imageId }
  }

  const showPhoto = (imageId: string): void => {
    photoViewer.value = { ...photoViewer.value, imageId }
  }

  const closePhotoViewer = (): void => {
    photoViewer.value = { isOpen: false, documentId: null, imageId: null }
  }

  return {
    folderModal,
    documentModal,
    photosModal,
    photoViewer,
    openFolderModal,
    closeFolderModal,
    openDocumentModal,
    closeDocumentModal,
    openPhotosModal,
    closePhotosModal,
    openPhotoViewer,
    showPhoto,
    closePhotoViewer,
  }
})
