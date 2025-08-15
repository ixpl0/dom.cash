<template>
  <div class="min-h-screen bg-base-100 p-6">
    <BudgetView :months-data="monthsData" />
  </div>
</template>

<script setup lang="ts">
const { monthsData, loadMonthsData } = useBudgetData()
const { loadUserData } = useUser()

await useAsyncData('budget-data', async () => {
  await Promise.all([loadMonthsData(), loadUserData()])
  return monthsData.value
})
</script>
