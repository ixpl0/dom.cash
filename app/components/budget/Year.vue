<template>
  <UiYear
    :year="year"
    :stats="yearStats"
    :labels="labels"
    :format-amount="formatAmountForDisplay"
  >
    <BudgetMonth
      v-for="monthData in months"
      :key="`${monthData.year}-${monthData.month}`"
      :month-id="createMonthId(monthData.year, monthData.month)"
    />
  </UiYear>
</template>

<script setup lang="ts">
import type { MonthData } from '~~/shared/types/budget'
import { formatAmountRounded } from '~~/shared/utils/budget/budget'
import { createMonthId } from '~~/shared/utils/budget/budget-calculations'
import { useBudgetStore } from '~/stores/budget/budget'
import type { UiYearStats, UiYearLabels } from '~/components/ui/Year.vue'

interface Props {
  year: number
  months: MonthData[]
  monthNames: string[]
}

const props = defineProps<Props>()

const { t } = useI18n()
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
  }
})

const labels = computed((): UiYearLabels => ({
  balance: t('budget.year.balance'),
  balanceTooltip: t('budget.year.balanceTooltip'),
  averageBalance: t('budget.year.averageBalance'),
  income: t('budget.year.income'),
  incomeTooltip: t('budget.year.incomeTooltip'),
  totalIncome: t('budget.year.totalIncome'),
  averageIncome: t('budget.year.averageIncome'),
  majorExpensesLine1: t('budget.year.majorExpensesLine1'),
  majorExpensesLine2: t('budget.year.majorExpensesLine2'),
  majorExpensesTooltip: t('budget.year.majorExpensesTooltip'),
  totalMajorExpenses: t('budget.year.totalMajorExpenses'),
  averageMajorExpenses: t('budget.year.averageMajorExpenses'),
  pocketExpensesLine1: t('budget.year.pocketExpensesLine1'),
  pocketExpensesLine2: t('budget.year.pocketExpensesLine2'),
  pocketExpensesFormula: t('budget.year.pocketExpensesFormula'),
  totalPocketExpenses: t('budget.year.totalPocketExpenses'),
  averagePocketExpenses: t('budget.year.averagePocketExpenses'),
  allExpenses: t('budget.year.allExpenses'),
  allExpensesFormula: t('budget.year.allExpensesFormula'),
  totalAllExpenses: t('budget.year.totalAllExpenses'),
  averageAllExpenses: t('budget.year.averageAllExpenses'),
  balanceChangeLine1: t('budget.year.balanceChangeLine1'),
  balanceChangeLine2: t('budget.year.balanceChangeLine2'),
  balanceChangeFormula: t('budget.year.balanceChangeFormula'),
  totalBalanceChange: t('budget.year.totalBalanceChange'),
  averageBalanceChange: t('budget.year.averageBalanceChange'),
  currencyFluctuationsLine1: t('budget.year.currencyFluctuationsLine1'),
  currencyFluctuationsLine2: t('budget.year.currencyFluctuationsLine2'),
  currencyFluctuationsFormula: t('budget.year.currencyFluctuationsFormula'),
  totalCurrencyFluctuations: t('budget.year.totalCurrencyFluctuations'),
  averageCurrencyFluctuations: t('budget.year.averageCurrencyFluctuations'),
  optionalExpensesLine1: t('budget.year.optionalExpensesLine1'),
  optionalExpensesLine2: t('budget.year.optionalExpensesLine2'),
  optionalExpensesTooltip: t('budget.year.optionalExpensesTooltip'),
  totalOptionalExpenses: t('budget.year.totalOptionalExpenses'),
  averageOptionalExpenses: t('budget.year.averageOptionalExpenses'),
}))

const formatAmountForDisplay = (amount: number): string => {
  return formatAmountRounded(amount, budgetStore.effectiveMainCurrency)
}
</script>
