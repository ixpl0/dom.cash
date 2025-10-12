<template>
  <UiDialog
    :is-open="isOpen"
    content-class="modal-box w-[calc(100vw-2rem)] max-w-xl max-h-[90vh] flex flex-col"
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
      {{ t('sharedBudgets.title') }}
    </h3>

    <div class="space-y-4 flex-1 overflow-y-auto overflow-x-auto min-h-0">
      <div
        v-if="sharedBudgets.length"
        class="min-w-[400px]"
      >
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('sharedBudgets.user') }}</th>
              <th class="w-1">
                {{ t('sharedBudgets.actions') }}
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
                  {{ t('sharedBudgets.goToBudget') }} {{ budget.username }}
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
                  <Icon
                    v-else
                    name="heroicons:trash"
                    size="16"
                  />
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
        {{ t('sharedBudgets.empty') }}
      </div>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
import { getErrorMessage } from '~~/shared/utils/errors'
import { useModalsStore } from '~/stores/modals'

interface SharedBudget {
  id: string
  username: string
  access: 'read' | 'write'
  createdAt?: Date
}

const sharedBudgets = ref<SharedBudget[]>([])
const isRevoking = ref<string | null>(null)
const isLoading = ref(false)
const modalsStore = useModalsStore()
const { t } = useI18n()
const { toast } = useToast()
const isOpen = computed(() => modalsStore.sharedBudgetsModal.isOpen)

const revokeAccess = async (id: string): Promise<void> => {
  const budget = sharedBudgets.value.find(b => b.id === id)
  const confirmMessage = budget
    ? `${t('sharedBudgets.revokeMessage')} <strong>${budget.username}</strong>`
    : t('sharedBudgets.revokeThisBudget')

  const { confirm } = useConfirmation()
  const confirmed = await confirm({
    title: t('sharedBudgets.revokeTitle'),
    message: confirmMessage,
    variant: 'warning',
    confirmText: t('sharedBudgets.revokeConfirm'),
    cancelText: t('common.cancel'),
    icon: 'heroicons:no-symbol',
  })

  if (!confirmed) {
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
    toast({ type: 'error', message: getErrorMessage(error, t('sharedBudgets.revokeError')) })
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
    else {
      throw new Error('Failed to load shared budgets')
    }
  }
  catch (error) {
    console.error('Error loading shared budgets:', error)
    toast({ type: 'error', message: getErrorMessage(error, t('sharedBudgets.loadError')) })
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
    await loadSharedBudgets()
  }
})
</script>
