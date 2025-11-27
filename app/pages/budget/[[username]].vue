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
const { subscribeToBudgetByUsername, unsubscribeFromBudgetByUsername } = useNotifications()

await budgetStore.refresh(targetUsername)

onMounted(async () => {
  if (budgetStore.data && budgetStore.canView) {
    const budgetOwnerUsername = budgetStore.data.user.username
    await subscribeToBudgetByUsername(budgetOwnerUsername)
  }
})

onBeforeUnmount(async () => {
  if (budgetStore.data) {
    const budgetOwnerUsername = budgetStore.data.user.username
    await unsubscribeFromBudgetByUsername(budgetOwnerUsername)
  }
})
</script>
