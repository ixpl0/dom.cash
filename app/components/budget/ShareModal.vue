<template>
  <UiDialog
    :is-open="isOpen"
    content-class="modal-box sm:max-h-[90vh] sm:w-[calc(100vw-2rem)] sm:max-w-3xl flex flex-col"
    data-testid="share-modal"
    @close="hide"
  >
    <button
      type="button"
      class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
      data-testid="share-modal-close"
      @click="hide()"
    >
      <Icon
        name="heroicons:x-mark"
        size="20"
      />
    </button>

    <h3 class="font-bold text-lg mb-4 flex-shrink-0">
      {{ t('share.title') }}
    </h3>

    <div class="space-y-4 flex-1 overflow-y-auto min-h-0">
      <div v-if="shares.length || isAddingNew">
        <div
          class="flex flex-col gap-2"
          data-testid="share-table"
        >
          <div
            v-for="share in shares"
            :key="share.id"
            class="flex flex-col gap-3 rounded-box bg-base-200 p-3 sm:flex-row sm:items-center"
            data-testid="share-row"
          >
            <span
              class="min-w-0 flex-1 break-all font-medium"
              data-testid="share-username"
            >{{ share.username }}</span>
            <div class="flex items-center justify-between gap-3">
              <select
                v-if="editingId === share.id"
                v-model="editingShare.access"
                class="select select-sm select-bordered min-w-0 flex-1 sm:w-48"
                data-testid="share-edit-access-select"
              >
                <option value="read">
                  {{ t('share.accessRead') }}
                </option>
                <option value="write">
                  {{ t('share.accessWrite') }}
                </option>
              </select>
              <span
                v-else
                class="text-sm text-base-content/70"
                data-testid="share-access"
              >{{ getAccessText(share.access) }}</span>
              <div class="flex flex-shrink-0 gap-2">
                <template v-if="editingId === share.id">
                  <button
                    class="btn btn-sm btn-success"
                    :disabled="isSaving"
                    data-testid="share-save-button"
                    @click="saveShare()"
                  >
                    <span
                      v-if="isSaving"
                      class="loading loading-spinner loading-xs"
                    />
                    <Icon
                      v-else
                      name="heroicons:check"
                      size="16"
                    />
                  </button>
                  <button
                    class="btn btn-sm btn-ghost"
                    data-testid="share-cancel-edit-button"
                    @click="cancelEdit()"
                  >
                    <Icon
                      name="heroicons:x-mark"
                      size="16"
                    />
                  </button>
                </template>
                <template v-else>
                  <button
                    class="btn btn-sm btn-warning"
                    data-testid="share-edit-button"
                    @click="startEdit(share)"
                  >
                    <Icon
                      name="heroicons:pencil-square"
                      size="16"
                    />
                  </button>
                  <button
                    class="btn btn-sm btn-error"
                    :disabled="isDeleting === share.id"
                    data-testid="share-delete-button"
                    @click="deleteShare(share.id)"
                  >
                    <span
                      v-if="isDeleting === share.id"
                      class="loading loading-spinner loading-xs"
                    />
                    <Icon
                      v-else
                      name="heroicons:trash"
                      size="16"
                    />
                  </button>
                </template>
              </div>
            </div>
          </div>

          <div
            v-if="isAddingNew"
            class="flex flex-col gap-3 rounded-box bg-base-200 p-3 sm:flex-row sm:items-center"
            data-testid="share-new-row"
          >
            <input
              v-model="newShare.username"
              type="text"
              :placeholder="t('share.usernamePlaceholder')"
              class="input input-bordered min-w-0 flex-1"
              data-testid="share-username-input"
              @keyup.enter="addShare()"
              @keyup.esc.stop="cancelAdd()"
            >
            <div class="flex items-center justify-between gap-3">
              <select
                v-model="newShare.access"
                class="select select-sm select-bordered min-w-0 flex-1 sm:w-48"
                data-testid="share-access-select"
              >
                <option value="read">
                  {{ t('share.accessRead') }}
                </option>
                <option value="write">
                  {{ t('share.accessWrite') }}
                </option>
              </select>
              <div class="flex flex-shrink-0 gap-2">
                <button
                  type="button"
                  class="btn btn-sm btn-success"
                  :disabled="isAdding"
                  data-testid="share-confirm-add-button"
                  @click="addShare()"
                >
                  <span
                    v-if="isAdding"
                    class="loading loading-spinner loading-xs"
                  />
                  <Icon
                    v-else
                    name="heroicons:check"
                    size="16"
                  />
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-ghost"
                  data-testid="share-cancel-add-button"
                  @click="cancelAdd()"
                >
                  <Icon
                    name="heroicons:x-mark"
                    size="16"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-center mt-4">
          <button
            v-if="!isAddingNew"
            class="btn btn-primary btn-sm"
            data-testid="share-add-new-button"
            @click="startAdd()"
          >
            {{ t('share.addNew') }}
          </button>
        </div>
      </div>
      <div
        v-else
        class="text-center py-8 text-base-content/60"
        data-testid="share-empty-state"
      >
        <div class="mb-4">
          {{ t('share.empty') }}
        </div>
        <button
          v-if="!isAddingNew"
          type="button"
          class="btn btn-primary btn-sm"
          data-testid="share-add-first-button"
          @click="startAdd()"
        >
          {{ t('share.addNew') }}
        </button>
      </div>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
import { useModalsStore } from '~/stores/budget/modals'
import type { ConfirmationModalMessage } from '~/components/ui/ConfirmationModal.vue'

interface ShareEntry {
  id: string
  username: string
  access: 'read' | 'write'
  createdAt?: Date | string
}

const shares = ref<ShareEntry[]>([])
const isLoading = ref(false)
const modalsStore = useModalsStore()
const isOpen = computed(() => modalsStore.shareModal.isOpen)
const { confirmClose, markAsChanged, markAsSaved } = useUnsavedChanges()
const { toast } = useToast()
const { t } = useI18n()
const { formatError } = useServerError()

const isAddingNew = ref(false)
const isAdding = ref(false)
const isSaving = ref(false)
const isDeleting = ref<string | null>(null)
const editingId = ref<string | null>(null)
const newShare = ref<ShareEntry>({ id: '', username: '', access: 'read' })
const editingShare = ref<ShareEntry>({ id: '', username: '', access: 'read' })

const startAdd = async (): Promise<void> => {
  newShare.value = { id: '', username: '', access: 'read' }
  await nextTick()
  isAddingNew.value = true
}

const cancelAdd = (): void => {
  isAddingNew.value = false
}

const addShare = async (): Promise<void> => {
  if (!newShare.value.username.trim()) {
    toast({ type: 'error', message: t('share.enterUsername') })
    return
  }

  isAdding.value = true

  try {
    const response = await $fetch('/api/budget/shares', {
      method: 'POST',
      body: {
        username: newShare.value.username,
        access: newShare.value.access,
      },
    })

    shares.value = [...shares.value, response]
    markAsSaved()
    cancelAdd()
    toast({ type: 'success', message: t('share.accessGranted') })
  }
  catch (error: unknown) {
    toast({ type: 'error', message: formatError(error, t('share.accessGrantError')) })
  }
  finally {
    isAdding.value = false
  }
}

const startEdit = (share: ShareEntry): void => {
  editingId.value = share.id
  editingShare.value = { ...share }
}

const cancelEdit = (): void => {
  editingId.value = null
}

const resetForm = (): void => {
  isAddingNew.value = false
  isAdding.value = false
  isSaving.value = false
  isDeleting.value = null
  editingId.value = null
  newShare.value = { id: '', username: '', access: 'read' }
  editingShare.value = { id: '', username: '', access: 'read' }
}

const saveShare = async (): Promise<void> => {
  if (!editingId.value) {
    return
  }

  isSaving.value = true

  try {
    const response = await $fetch(`/api/budget/shares/${editingId.value}`, {
      method: 'PUT',
      body: {
        access: editingShare.value.access,
      },
    })

    const index = shares.value.findIndex(s => s.id === editingId.value)
    if (index !== -1) {
      shares.value = [
        ...shares.value.slice(0, index),
        response,
        ...shares.value.slice(index + 1),
      ]
    }
    markAsSaved()
    cancelEdit()
    toast({ type: 'success', message: t('share.changesSaved') })
  }
  catch (error: unknown) {
    toast({ type: 'error', message: formatError(error, t('share.changesError')) })
  }
  finally {
    isSaving.value = false
  }
}

const deleteShare = async (id: string): Promise<void> => {
  const share = shares.value.find(s => s.id === id)
  const shareUsername = share ? share.username : t('share.usernameFallback')
  const { confirm } = useConfirmation()

  const message: ConfirmationModalMessage = [
    t('share.deleteMessage'),
    { text: shareUsername, isBold: true },
  ]

  const confirmed = await confirm({
    title: t('share.deleteTitle'),
    message,
    variant: 'danger',
    confirmText: t('share.deleteConfirm'),
    cancelText: t('common.cancel'),
  })

  if (!confirmed) {
    return
  }

  isDeleting.value = id

  try {
    await $fetch(`/api/budget/shares/${id}`, {
      method: 'DELETE',
    })

    shares.value = shares.value.filter(s => s.id !== id)
  }
  catch (error) {
    console.error('Error deleting share:', error)
    toast({ type: 'error', message: formatError(error, t('share.deleteError')) })
  }
  finally {
    isDeleting.value = null
  }
}

const getAccessText = (access: ShareEntry['access']): string => {
  return access === 'read' ? t('share.accessRead') : t('share.accessWrite')
}

const loadShares = async (): Promise<void> => {
  if (isLoading.value) return

  isLoading.value = true
  try {
    shares.value = await $fetch<ShareEntry[]>('/api/budget/shares')
  }
  catch (error) {
    console.error('Error loading shares:', error)
    toast({ type: 'error', message: formatError(error, t('share.loadError')) })
  }
  finally {
    isLoading.value = false
  }
}

const hide = async (): Promise<void> => {
  if (!(await confirmClose())) {
    return
  }

  markAsSaved()
  modalsStore.closeShareModal()
}

watch(isOpen, async (open) => {
  if (open) {
    resetForm()
    await loadShares()
    markAsSaved()
  }
})

watch([isAddingNew, editingId], () => {
  markAsSaved()
})

watch([newShare, editingShare], () => {
  if (isAddingNew.value || editingId.value) {
    markAsChanged()
  }
}, { deep: true })
</script>
