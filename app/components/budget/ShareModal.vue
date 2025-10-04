<template>
  <UiDialog
    :is-open="isOpen"
    content-class="modal-box w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] flex flex-col"
    @close="hide"
  >
    <button
      type="button"
      class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
      @click="hide()"
    >
      <Icon
        name="heroicons:x-mark"
        size="20"
      />
    </button>

    <h3 class="font-bold text-lg mb-4 flex-shrink-0">
      Общий доступ к вашему бюджету
    </h3>

    <div class="space-y-4 flex-1 overflow-y-auto overflow-x-auto min-h-0">
      <div
        v-if="shares.length || isAddingNew"
        class="min-w-[500px]"
      >
        <table class="table">
          <thead>
            <tr>
              <th>Имя пользователя</th>
              <th>Уровень доступа</th>
              <th class="w-1">
                Действия
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="share in shares"
              :key="share.id"
            >
              <td>
                <input
                  v-if="editingId === share.id"
                  v-model="editingShare.username"
                  type="text"
                  class="input input-bordered w-full"
                  @keyup.enter="saveShare()"
                  @keyup.esc="cancelEdit()"
                >
                <span v-else>{{ share.username }}</span>
              </td>
              <td>
                <select
                  v-if="editingId === share.id"
                  v-model="editingShare.access"
                  class="select select-sm select-bordered w-full max-w-xs"
                >
                  <option value="read">
                    Только чтение
                  </option>
                  <option value="write">
                    Чтение и редактирование
                  </option>
                </select>
                <span v-else>{{ getAccessText(share.access) }}</span>
              </td>
              <td class="w-1">
                <div class="flex gap-2">
                  <template v-if="editingId === share.id">
                    <button
                      class="btn btn-sm btn-success"
                      :disabled="isSaving"
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
              </td>
            </tr>
            <tr v-if="isAddingNew">
              <td>
                <input
                  v-model="newShare.username"
                  type="text"
                  placeholder="Имя пользователя"
                  class="input input-bordered w-full"
                  @keyup.enter="addShare()"
                  @keyup.esc="cancelAdd()"
                >
              </td>
              <td>
                <select
                  v-model="newShare.access"
                  class="select select-sm select-bordered w-full max-w-xs"
                >
                  <option value="read">
                    Только чтение
                  </option>
                  <option value="write">
                    Чтение и редактирование
                  </option>
                </select>
              </td>
              <td class="w-1">
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="btn btn-sm btn-success"
                    :disabled="isAdding"
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
                    @click="cancelAdd()"
                  >
                    <Icon
                      name="heroicons:x-mark"
                      size="16"
                    />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="flex justify-center mt-4">
          <button
            v-if="!isAddingNew"
            class="btn btn-primary btn-sm"
            @click="startAdd()"
          >
            Поделиться бюджетом с новым пользователем
          </button>
        </div>
      </div>
      <div
        v-else
        class="text-center py-8 text-base-content/60"
      >
        <div class="mb-4">
          Вы ещё ни с кем не поделились бюджетом
        </div>
        <button
          v-if="!isAddingNew"
          type="button"
          class="btn btn-primary btn-sm"
          @click="startAdd()"
        >
          Поделиться бюджетом с новым пользователем
        </button>
      </div>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
import { useModalsStore } from '~/stores/modals'

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

const getErrorMessage = (error: unknown, fallback: string): string => {
  return error
    && typeof error === 'object'
    && 'data' in error
    && error.data
    && typeof error.data === 'object'
    && 'message' in error.data
    ? String(error.data.message)
    : fallback
}

const isAddingNew = ref(false)
const isAdding = ref(false)
const isSaving = ref(false)
const isDeleting = ref<string | null>(null)
const editingId = ref<string | null>(null)
const newShare = ref<ShareEntry>({ id: '', username: '', access: 'read' })
const editingShare = ref<ShareEntry>({ id: '', username: '', access: 'read' })

const startAdd = (): void => {
  isAddingNew.value = true
  newShare.value = { id: '', username: '', access: 'read' }
}

const cancelAdd = (): void => {
  isAddingNew.value = false
}

const addShare = async (): Promise<void> => {
  if (!newShare.value.username.trim()) {
    toast({ type: 'error', message: 'Введите имя пользователя' })
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
    toast({ type: 'success', message: 'Доступ успешно предоставлен' })
  }
  catch (error: unknown) {
    toast({ type: 'error', message: getErrorMessage(error, 'Не удалось предоставить доступ') })
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

  if (!editingShare.value.username.trim()) {
    toast({ type: 'error', message: 'Введите имя пользователя' })
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
    toast({ type: 'success', message: 'Изменения сохранены' })
  }
  catch (error: unknown) {
    toast({ type: 'error', message: getErrorMessage(error, 'Не удалось сохранить изменения') })
  }
  finally {
    isSaving.value = false
  }
}

const deleteShare = async (id: string): Promise<void> => {
  const share = shares.value.find(s => s.id === id)
  const shareUsername = share ? share.username : 'этого пользователя'

  const { confirm } = useConfirmation()
  const confirmed = await confirm({
    title: 'Удаление доступа',
    message: `Вы действительно хотите отозвать доступ к бюджету у <strong>${shareUsername}</strong>?`,
    variant: 'danger',
    confirmText: 'Удалить',
    cancelText: 'Отмена',
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
  finally {
    isDeleting.value = null
  }
}

const getAccessText = (access: ShareEntry['access']): string => {
  return access === 'read' ? 'Только чтение' : 'Чтение и редактирование'
}

const loadShares = async (): Promise<void> => {
  if (isLoading.value) return

  isLoading.value = true
  try {
    const response = await fetch('/api/budget/shares')
    if (response.ok) {
      shares.value = await response.json()
    }
  }
  catch (error) {
    console.error('Error loading shares:', error)
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
