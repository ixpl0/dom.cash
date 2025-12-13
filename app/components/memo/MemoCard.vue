<template>
  <UiMemoCard
    :content="memo.content"
    :is-completed="memo.isCompleted"
    :planned-date="memo.plannedDate"
    :is-owner="memo.isOwner"
    :owner-username="memo.ownerUsername"
    :shared-with="memo.sharedWith"
    :author-tooltip="t('memo.card.author')"
    :shared-with-tooltip="t('memo.card.sharedWith')"
    @toggle="handleToggle"
    @edit="handleEdit"
    @delete="handleDelete"
  />
</template>

<script setup lang="ts">
import type { MemoListItem } from '~~/shared/types/memo'

interface Props {
  memo: MemoListItem
}

const props = defineProps<Props>()

const memoStore = useMemoStore()
const memoModalsStore = useMemoModalsStore()
const { confirm } = useConfirmation()
const { t } = useI18n()

const handleToggle = async () => {
  await memoStore.toggleTodo(props.memo.id)
}

const handleEdit = () => {
  memoModalsStore.openMemoModal(props.memo.id)
}

const handleDelete = async () => {
  const confirmed = await confirm({
    title: t('memo.delete.title'),
    message: t('memo.delete.message'),
    variant: 'danger',
    confirmText: t('memo.delete.confirm'),
    icon: 'heroicons:trash',
  })

  if (confirmed) {
    await memoStore.deleteMemo(props.memo.id)
  }
}
</script>
