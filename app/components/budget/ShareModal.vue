<template>
  <dialog
    ref="modal"
    class="modal"
    @close="handleDialogClose"
  >
    <div class="modal-box w-11/12 max-w-3xl">
      <button
        type="button"
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="hide()"
      >
        ✕
      </button>

      <h3 class="font-bold text-lg mb-4">
        Общий доступ к вашему бюджету
      </h3>

      <div class="space-y-4 mb-6">
        <div v-if="shares.length || isAddingNew">
          <div class="overflow-x-auto">
            <table class="table table-zebra">
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
                      class="input input-sm input-bordered w-full"
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
                          <span v-else>✓</span>
                        </button>
                        <button
                          class="btn btn-sm btn-ghost"
                          @click="cancelEdit()"
                        >
                          ✕
                        </button>
                      </template>
                      <template v-else>
                        <button
                          class="btn btn-sm btn-warning"
                          @click="startEdit(share)"
                        >
                          ✏️
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
                          <span v-else>🗑️</span>
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
                      class="input input-sm input-bordered w-full"
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
                        <span v-else>✓</span>
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-ghost"
                        @click="cancelAdd()"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

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

      <div class="modal-action">
        <button
          type="button"
          class="btn"
          @click="hide()"
        >
          Закрыть
        </button>
      </div>
    </div>
    <div
      class="modal-backdrop"
      @click="handleBackdropClick"
    />
  </dialog>
</template>

<script setup lang="ts">
interface ShareEntry {
  id: string
  username: string
  access: 'read' | 'write'
  createdAt?: Date | string
}

const shares = ref<ShareEntry[]>([])
const isLoading = ref(false)
const modal = ref<HTMLDialogElement>()

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
    cancelAdd()
  }
  catch (error) {
    console.error('Error adding share:', error)
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
    cancelEdit()
  }
  catch (error) {
    console.error('Error saving share:', error)
  }
  finally {
    isSaving.value = false
  }
}

const deleteShare = async (id: string): Promise<void> => {
  isDeleting.value = id

  try {
    await $fetch(`/api/budget/shares/${id}`, {
      method: 'DELETE',
    })

    shares.value = shares.value.filter(s => s.id !== id)
  }
  catch (error) {
    console.error('Error deleting share:', error)
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

const show = async (): Promise<void> => {
  modal.value?.showModal()
  await loadShares()
}

const hide = (): void => {
  modal.value?.close()
}

const handleBackdropClick = (): void => {
  hide()
}

const handleDialogClose = (): void => {
  cancelAdd()
  cancelEdit()
}

defineExpose({ show, hide })
</script>
