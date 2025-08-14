<template>
  <div class="flex gap-2">
    <button
      v-if="sharedBudgets.length"
      class="btn btn-secondary btn-sm"
      @click="openSharedBudgets"
    >
      Ваши бюджеты
    </button>
    <button
      class="btn btn-primary btn-sm"
      @click="openShare"
    >
      Общий доступ
    </button>
    <BudgetShareModal ref="shareModal" />
    <SharedBudgetsModal ref="sharedModal" />
  </div>
</template>

<script setup lang="ts">
import BudgetShareModal from '~/components/budget/BudgetShareModal.vue'
import SharedBudgetsModal from '~/components/budget/SharedBudgetsModal.vue'
import { useBudgetSharing } from '~/composables/useBudgetSharing'

const { sharedBudgets } = useBudgetSharing()

const shareModal = ref<InstanceType<typeof BudgetShareModal> | null>(null)
const sharedModal = ref<InstanceType<typeof SharedBudgetsModal> | null>(null)

const openShare = (): void => {
  shareModal.value?.show()
}

const openSharedBudgets = (): void => {
  sharedModal.value?.show()
}
</script>
