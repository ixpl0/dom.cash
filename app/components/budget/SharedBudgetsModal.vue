<template>
  <dialog
    ref="modal"
    class="modal"
    @close="handleDialogClose"
  >
    <div class="modal-box w-11/12 max-w-2xl">
      <button
        type="button"
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        @click="hide()"
      >
        ✕
      </button>
      <h3 class="font-bold text-lg mb-4">
        Бюджеты, которыми с вами поделились
      </h3>
      <div class="space-y-4 mb-6">
        <div v-if="sharedBudgets.length">
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Бюджет</th>
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
                    >
                      Перейти к бюджету {{ budget.username }}
                    </NuxtLink>
                  </td>
                  <td class="w-1">
                    <button
                      class="btn btn-sm btn-error"
                      :disabled="isDeleting === budget.id"
                      @click="removeAccess(budget.id)"
                    >
                      <span
                        v-if="isDeleting === budget.id"
                        class="loading loading-spinner loading-xs"
                      />
                      <span v-else>🗑️</span>
                    </button>
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
          Нет бюджетов, которыми с вами поделились
        </div>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { useBudgetSharing } from '~/composables/useBudgetSharing'

const { sharedBudgets } = useBudgetSharing()

const modal = ref<HTMLDialogElement | null>(null)
const isDeleting = ref<number | null>(null)

const removeAccess = async (id: number): Promise<void> => {
  isDeleting.value = id
  try {
    sharedBudgets.value = sharedBudgets.value.filter(b => b.id !== id)
    // TODO отправить запрос на бэкенд для отказа от доступа
  }
  finally {
    isDeleting.value = null
  }
}

const show = (): void => {
  modal.value?.showModal()
}

const hide = (): void => {
  modal.value?.close()
}

const handleDialogClose = (): void => {
  // no-op
}

defineExpose({
  show,
  hide,
})
</script>
