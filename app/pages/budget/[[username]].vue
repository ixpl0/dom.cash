<template>
  <div class="bg-base-100">
    <BudgetScreen :key="`budget-${targetUsername || 'own'}`" />
  </div>
</template>

<script setup lang="ts">
import { useBudgetStore } from '~/stores/budget/budget'

const LAST_SHARED_BUDGET_COOKIE = 'lastSharedBudget'

const route = useRoute()
const lastSharedBudgetCookie = useCookie(LAST_SHARED_BUDGET_COOKIE, {
  maxAge: 60 * 60 * 24 * 365,
})

const routeUsername = Array.isArray(route.params.username)
  ? route.params.username[0]
  : route.params.username

const targetUsername = routeUsername || lastSharedBudgetCookie.value || undefined

if (!routeUsername && lastSharedBudgetCookie.value) {
  await navigateTo(`/budget/${lastSharedBudgetCookie.value}`, { replace: true })
}

if (routeUsername) {
  lastSharedBudgetCookie.value = routeUsername
}

const budgetStore = useBudgetStore()
const { subscribeToBudgetByUsername, unsubscribeFromBudgetByUsername } = useNotifications()
const { hideWarningBanner } = useOutdatedBanner()

useVisibilityRefresh(async () => {
  await budgetStore.forceRefresh(targetUsername)
  hideWarningBanner()
})

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
