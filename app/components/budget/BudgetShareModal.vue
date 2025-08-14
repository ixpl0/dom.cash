<template>
  <dialog
    ref="modal"
    class="modal"
    @close="handleDialogClose"
  >
    <div class="modal-box w-11/12 max-w-5xl">
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
                      class="select select-sm select-bordered w-full"
                    >
                      <option value="read">
                        Только чтение
                      </option>
                      <option value="write">
                        Чтение и редактирование
                      </option>
                    </select>
                    <span v-else>{{ accessLabel(share.access) }}</span>
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
                      class="select select-sm select-bordered w-full"
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
                        :disabled="isSaving"
                        @click="addShare()"
                      >
                        <span
                          v-if="isSaving"
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
        </div>
        <div
          v-else
          class="text-center py-6 opacity-70"
        >
          Нет пользователей с доступом
        </div>
      </div>
      <div class="modal-action">
        <button
          v-if="!isAddingNew"
          class="btn btn-primary"
          @click="startAdd"
        >
          Поделиться бюджетом с новым пользователем
        </button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { useBudgetSharing, type BudgetShare } from '~/composables/useBudgetSharing'

const { shares } = useBudgetSharing()

const modal = ref<HTMLDialogElement | null>(null)
const isAddingNew = ref(false)
const isSaving = ref(false)
const isDeleting = ref<number | null>(null)
const editingId = ref<number | null>(null)

const newShare = reactive<Omit<BudgetShare, 'id'>>({ username: '', access: 'read' })
const editingShare = reactive<Omit<BudgetShare, 'id'>>({ username: '', access: 'read' })

const startAdd = (): void => {
  isAddingNew.value = true
}

const cancelAdd = (): void => {
  isAddingNew.value = false
  newShare.username = ''
  newShare.access = 'read'
}

const addShare = async (): Promise<void> => {
  if (!newShare.username.trim()) return
  isSaving.value = true
  try {
    shares.value.push({ id: Date.now(), ...newShare })
    // TODO отправить запрос на бэкенд для добавления пользователя
    cancelAdd()
  }
  finally {
    isSaving.value = false
  }
}

const startEdit = (share: BudgetShare): void => {
  editingId.value = share.id
  editingShare.username = share.username
  editingShare.access = share.access
}

const cancelEdit = (): void => {
  editingId.value = null
}

const saveShare = async (): Promise<void> => {
  if (editingId.value === null || !editingShare.username.trim()) return
  isSaving.value = true
  try {
    const idx = shares.value.findIndex(s => s.id === editingId.value)
    if (idx !== -1) {
      shares.value[idx] = { id: editingId.value, ...editingShare }
      // TODO отправить запрос на бэкенд для обновления доступа
    }
    cancelEdit()
  }
  finally {
    isSaving.value = false
  }
}

const deleteShare = async (id: number): Promise<void> => {
  isDeleting.value = id
  try {
    shares.value = shares.value.filter(s => s.id !== id)
    // TODO отправить запрос на бэкенд для удаления доступа
  }
  finally {
    isDeleting.value = null
  }
}

const accessLabel = (access: BudgetShare['access']): string => {
  return access === 'write' ? 'Чтение и редактирование' : 'Только чтение'
}

const show = (): void => {
  modal.value?.showModal()
}

const hide = (): void => {
  modal.value?.close()
}

const handleDialogClose = (): void => {
  cancelAdd()
  cancelEdit()
}

defineExpose({
  show,
  hide,
})
</script>
