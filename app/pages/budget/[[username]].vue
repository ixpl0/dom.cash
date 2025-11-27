<template>
  <div class="bg-base-100">
    <BudgetScreen :key="`budget-${targetUsername || 'own'}`" />
  </div>
</template>

<script setup lang="ts">
import { useBudgetStore } from '~/stores/budget'

const route = useRoute()
const targetUsername = Array.isArray(route.params.username)
  ? route.params.username[0]
  : route.params.username

const budgetStore = useBudgetStore()
const { subscribeToBudget, unsubscribeFromBudget } = useNotifications()

await budgetStore.refresh(targetUsername)

onMounted(() => {
  if (budgetStore.data && budgetStore.canView) {
    subscribeToBudget(budgetStore.data.user.id)
  }
})

onBeforeUnmount(() => {
  unsubscribeFromBudget()
})
</script>
