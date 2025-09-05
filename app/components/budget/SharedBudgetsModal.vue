<template>
  <dialog
    ref="modal"
    class="modal"
  >
    <div class="modal-box w-11/12 max-w-xl max-h-[90vh] flex flex-col">
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
        Бюджеты, которыми с вами поделились
      </h3>

      <div class="space-y-4 mb-6 flex-1 overflow-y-auto min-h-0">
        <div v-if="sharedBudgets.length">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th class="w-1">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="budget in sharedBudgets"
                :key="budget.id"
              >
                <td>
                  <NuxtLink
                    :to="`/budget/${budget.username}`"
                    class="btn btn-sm btn-ghost"
                    @click="hide()"
                  >
                    Перейти к бюджету {{ budget.username }}
                  </NuxtLink>
                </td>
                <td class="w-1">
                  <button
                    class="btn btn-sm btn-error"
                    :disabled="isRevoking === budget.id"
                    @click="revokeAccess(budget.id)"
                  >
                    <span
                      v-if="isRevoking === budget.id"
                      class="loading loading-spinner loading-xs"
                    />
                    <span v-else>🗑️</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-else
          class="text-center py-8 text-base-content/60"
        >
          Пока нет бюджетов, которыми с вами поделились
        </div>
      </div>
    </div>
    <div
      class="modal-backdrop"
      @click="hide"
    />
  </dialog>
</template>

<script setup lang="ts">
import { useModalsStore } from '~/stores/modals'

interface SharedBudget {
  id: string
  username: string
  access: 'read' | 'write'
  createdAt?: Date
}

const sharedBudgets = ref<SharedBudget[]>([])
const modal = ref<HTMLDialogElement | null>(null)
const isRevoking = ref<string | null>(null)
const isLoading = ref(false)
const modalsStore = useModalsStore()
const isOpen = computed(() => modalsStore.sharedBudgetsModal.isOpen)

const revokeAccess = async (id: string): Promise<void> => {
  const budget = sharedBudgets.value.find(b => b.id === id)
  const confirmMessage = budget
    ? `Вы уверены, что хотите отказаться от доступа к бюджету пользователя ${budget.username}?`
    : 'Вы уверены, что хотите отказаться от этого доступа?'

  if (!confirm(confirmMessage)) {
    return
  }

  isRevoking.value = id

  try {
    await $fetch(`/api/budget/shared/${id}`, {
      method: 'DELETE',
    })

    sharedBudgets.value = sharedBudgets.value.filter(b => b.id !== id)
  }
  catch (error) {
    console.error('Error revoking access:', error)
  }
  finally {
    isRevoking.value = null
  }
}

const loadSharedBudgets = async (): Promise<void> => {
  if (isLoading.value) return

  isLoading.value = true
  try {
    const response = await fetch('/api/budget/shared')
    if (response.ok) {
      sharedBudgets.value = await response.json()
    }
  }
  catch (error) {
    console.error('Error loading shared budgets:', error)
  }
  finally {
    isLoading.value = false
  }
}

const hide = (): void => {
  modalsStore.closeSharedBudgetsModal()
}

watch(isOpen, async (open) => {
  if (open) {
    modal.value?.showModal()
    await loadSharedBudgets()
  }
  else {
    modal.value?.close()
  }
})
</script>
