<template>
  <UiMemoModal
    :is-open="memoModalsStore.memoModal.isOpen"
    :is-editing="isEditing"
    :is-saving="isSaving"
    :is-owner="isOwner"
    :create-title="t('memo.modal.createTitle')"
    :edit-title="t('memo.modal.editTitle')"
    :content-label="t('memo.modal.contentLabel')"
    :content-placeholder="t('memo.modal.contentPlaceholder')"
    :date-label="t('memo.modal.dateLabel')"
    :share-label="t('memo.modal.shareLabel')"
    :share-private="t('memo.modal.sharePrivate')"
    :cancel-text="t('memo.modal.cancel')"
    :save-text="t('memo.modal.save')"
    :connections="memoStore.connections"
    :initial-content="initialContent"
    :initial-planned-date="initialPlannedDate"
    :initial-shared-with-user-ids="initialSharedWithUserIds"
    @close="handleClose"
    @save="handleSave"
  />
</template>

<script setup lang="ts">
import type { MemoType } from '~~/shared/types/memo'

const memoStore = useMemoStore()
const memoModalsStore = useMemoModalsStore()
const { t } = useI18n()

const isSaving = ref(false)

const editingMemo = computed(() => {
  const memoId = memoModalsStore.memoModal.editingMemoId
  if (!memoId) {
    return null
  }
  return memoStore.getMemoById(memoId) ?? null
})

const isEditing = computed(() => !!editingMemo.value)
const isOwner = computed(() => editingMemo.value?.isOwner ?? true)

const initialContent = computed(() => editingMemo.value?.content ?? '')
const initialPlannedDate = computed(() => editingMemo.value?.plannedDate ?? null)
const initialSharedWithUserIds = computed(() =>
  editingMemo.value?.sharedWith.map(s => s.id) ?? [],
)

const handleClose = () => {
  memoModalsStore.closeMemoModal()
}

const handleSave = async (data: {
  type: MemoType
  content: string
  plannedDate: string | null
  sharedWithUserIds: string[]
}) => {
  isSaving.value = true

  try {
    if (editingMemo.value) {
      await memoStore.updateMemo(editingMemo.value.id, {
        content: data.content,
        plannedDate: data.plannedDate,
        sharedWithUserIds: data.sharedWithUserIds,
      })
    }
    else {
      await memoStore.createMemo({
        type: data.type,
        content: data.content,
        plannedDate: data.plannedDate ?? undefined,
        sharedWithUserIds: data.sharedWithUserIds.length > 0 ? data.sharedWithUserIds : undefined,
      })
    }
    handleClose()
  }
  finally {
    isSaving.value = false
  }
}
</script>
