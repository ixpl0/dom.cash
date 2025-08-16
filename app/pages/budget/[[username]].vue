<template>
  <div class="bg-base-100 p-6">
    <BudgetScreen
      :budget="budget.data.value"
      :can-edit="budget.canEdit.value"
      :is-loading="budget.isLoading.value"
      :error="budget.error.value"
      :on-create-month="budget.createMonth"
      :on-create-next-month="budget.createNextMonth"
      :on-create-previous-month="budget.createPreviousMonth"
      :on-get-next-month="budget.getNextMonth"
      :on-get-previous-month="budget.getPreviousMonth"
      :on-update-currency="budget.updateCurrency"
    />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const targetUsername = Array.isArray(route.params.username)
  ? route.params.username[0]
  : route.params.username

const budget = useBudget(targetUsername)

await budget.refresh()
</script>
