interface MemoModalState {
  isOpen: boolean
  editingMemoId: string | null
}

export const useMemoModalsStore = defineStore('memoModals', () => {
  const memoModal = ref<MemoModalState>({
    isOpen: false,
    editingMemoId: null,
  })

  const openMemoModal = (memoId?: string) => {
    memoModal.value = {
      isOpen: true,
      editingMemoId: memoId ?? null,
    }
  }

  const closeMemoModal = () => {
    memoModal.value = {
      ...memoModal.value,
      isOpen: false,
    }
  }

  return {
    memoModal,
    openMemoModal,
    closeMemoModal,
  }
})
