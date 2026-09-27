<template>
  <div class="bg-base-100">
    <BudgetScreen :key="`budget-${targetUsername || 'own'}`" />
  </div>
</template>

<script setup lang="ts">
import { useBudgetStore } from '~/stores/budget/budget'
import { COOKIE_NAMES } from '~/utils/cookies'

definePageMeta({
  middleware: (to) => {
    const lastSharedBudget = useCookie<string | null>(COOKIE_NAMES.lastSharedBudget)
    if (!to.params.username && lastSharedBudget.value) {
      return navigateTo(`/budget/${lastSharedBudget.value}`, { replace: true })
    }
  },
})

const route = useRoute()
const lastSharedBudgetCookie = useCookie<string | null>(COOKIE_NAMES.lastSharedBudget, {
  maxAge: 60 * 60 * 24 * 365,
})

const routeUsername = Array.isArray(route.params.username)
  ? route.params.username[0]
  : route.params.username

const targetUsername = routeUsername || undefined

const budgetStore = useBudgetStore()

useLiveBudget(() => budgetStore.canView ? budgetStore.data?.user.username : undefined)

await callOnce('budget-page', () => budgetStore.load(targetUsername), { mode: 'navigation' })

if (targetUsername) {
  lastSharedBudgetCookie.value = budgetStore.loadError ? null : targetUsername
}
</script>
