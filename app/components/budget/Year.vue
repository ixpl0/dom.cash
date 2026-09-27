<template>
  <UiYear
    :year="year"
    :stats="yearStats"
    :is-planning-mode="budgetStore.isPlanningMode"
    :format-amount="formatAmountForDisplay"
    :amount-sign="getAmountSignForDisplay"
  >
    <BudgetMonth
      v-for="monthData in months"
      :key="`${monthData.year}-${monthData.month}-${budgetStore.isPlanningMode}`"
      :month-id="createMonthId(monthData.year, monthData.month)"
    />
  </UiYear>
</template>

<script setup lang="ts">
import type { MonthData } from '~~/shared/types/budget'
import { createMonthId } from '~~/shared/utils/budget/budget-calculations'
import { useBudgetStore } from '~/stores/budget/budget'
import type { UiYearStats } from '~/components/ui/Year.vue'

interface Props {
  year: number
  months: MonthData[]
}

const props = defineProps<Props>()

const { formatMoneyRounded, getRoundedMoneySign } = useMoneyFormat()
const budgetStore = useBudgetStore()

const yearStats = computed((): UiYearStats => {
  const summary = budgetStore.getYearSummary(props.year)
  if (!summary) {
    return {
      averageBalance: 0,
      totalIncome: 0,
      averageIncome: 0,
      totalExpenses: 0,
      averageExpenses: 0,
      totalOptionalExpenses: 0,
      averageOptionalExpenses: 0,
      totalPocketExpenses: 0,
      averagePocketExpenses: 0,
      totalAllExpenses: 0,
      averageAllExpenses: 0,
      totalBalanceChange: 0,
      averageBalanceChange: 0,
      totalCurrencyProfitLoss: 0,
      averageCurrencyProfitLoss: 0,
      totalPlannedBalanceChange: 0,
      totalPlannedVsActualDiff: 0,
      plannedMonthCount: 0,
      plannedDiffMonthCount: 0,
      endOfYearExpectedBalance: null,
    }
  }

  return {
    averageBalance: summary.avgStartBalance,
    totalIncome: summary.totalIncome,
    averageIncome: summary.avgIncome,
    totalExpenses: summary.totalExpenses,
    averageExpenses: summary.avgExpenses,
    totalOptionalExpenses: summary.totalOptionalExpenses,
    averageOptionalExpenses: summary.avgOptionalExpenses,
    totalPocketExpenses: summary.totalPocketExpenses,
    averagePocketExpenses: summary.avgPocketExpenses,
    totalAllExpenses: summary.totalAllExpenses,
    averageAllExpenses: summary.avgAllExpenses,
    totalBalanceChange: summary.totalBalanceChange,
    averageBalanceChange: summary.avgBalanceChange,
    totalCurrencyProfitLoss: summary.totalCurrencyProfitLoss,
    averageCurrencyProfitLoss: summary.avgCurrencyProfitLoss,
    totalPlannedBalanceChange: summary.totalPlannedBalanceChange,
    totalPlannedVsActualDiff: summary.totalPlannedVsActualDiff,
    plannedMonthCount: summary.plannedMonthCount,
    plannedDiffMonthCount: summary.plannedDiffMonthCount,
    endOfYearExpectedBalance: summary.endOfYearExpectedBalance,
  }
})

const formatAmountForDisplay = (amount: number): string => {
  return formatMoneyRounded(amount, budgetStore.effectiveMainCurrency)
}

const getAmountSignForDisplay = (amount: number): number =>
  getRoundedMoneySign(amount, budgetStore.effectiveMainCurrency)
</script>
