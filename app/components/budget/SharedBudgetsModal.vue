<template>
  <dialog
    ref="modal"
    class="modal"
    @close="handleDialogClose"
  >
    <div class="modal-box w-11/12 max-w-xl">
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
        <div v-if="budgets.length">
          <div class="overflow-x-auto">
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
                  v-for="budget in budgets"
                  :key="budget.id"
                >
                  <td>
                    <button
                      class="btn btn-sm btn-ghost"
                      @click="goToBudget(budget.username)"
                    >
                      Перейти к бюджету {{ budget.username }}
                    </button>
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
        </div>
        <div
          v-else
          class="text-center py-8 text-base-content/60"
        >
          Пока нет бюджетов
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
interface SharedBudget {
  id: string
  username: string
}

const props = defineProps<{ initialBudgets?: SharedBudget[] }>()

const budgets = ref<SharedBudget[]>(props.initialBudgets || [])

const modal = ref<HTMLDialogElement>()
const isRevoking = ref<string | null>(null)
const router = useRouter()

const show = (): void => {
  modal.value?.showModal()
}

const hide = (): void => {
  modal.value?.close()
}

const handleBackdropClick = (): void => {
  hide()
}

const handleDialogClose = (): void => {
  // no-op
}

const goToBudget = (username: string): void => {
  // TODO: переход к бюджету пользователя
  router.push(`/budget/${username}`)
}

const revokeAccess = async (id: string): Promise<void> => {
  isRevoking.value = id

  try {
    // TODO: запрос на бекенд для отказа от доступа
    budgets.value = budgets.value.filter(b => b.id !== id)
  }
  finally {
    isRevoking.value = null
  }
}

defineExpose({ show, hide })
</script>
