<template>
  <UiMonth
    :month-name="budgetStore.monthNames[monthData.month] ?? ''"
    :month-badge-tooltip="monthBadgeTooltip"
    :has-missing-rates="monthData.missingRateCurrencies.length > 0"
    :balance-tooltip="balanceTooltip"
    :income-tooltip="incomeTooltip"
    :expenses-tooltip="expensesTooltip"
    :pocket-expenses-tooltip="pocketExpensesTooltip"
    :total-expenses-tooltip="totalExpensesTooltip"
    :balance-change-tooltip="balanceChangeTooltip"
    :currency-fluctuation-tooltip="currencyFluctuationTooltip"
    :optional-expenses-tooltip="optionalExpensesTooltip"
    :planned-balance-change-tooltip="plannedBalanceChangeTooltip"
    :expected-balance-tooltip="expectedBalanceTooltip"
    :data="uiMonthData"
    :is-current-month="isCurrentMonthValue"
    :is-read-only="isReadOnly"
    :can-delete="canDeleteMonth"
    :is-planning-mode="budgetStore.isPlanningMode"
    :is-past-month="isPastMonthValue"
    :format-amount="formatAmountForDisplay"
    :amount-sign="getAmountSignForDisplay"
    @balance-click="openBalanceModal"
    @income-click="openIncomeModal"
    @expense-click="openExpenseModal"
    @currency-rates-click="openCurrencyRatesModal"
    @delete-click="handleDeleteMonth"
    @plan-click="openPlanModal"
  />
</template>

<script setup lang="ts">
import { isFirstMonth, isLastMonth, isCurrentMonth, isPastMonth } from '~~/shared/utils/budget/month-helpers'
import { capitalizeFirstLetter } from '~~/shared/utils/shared/text'
import { useBudgetStore } from '~/stores/budget/budget'
import { useModalsStore } from '~/stores/budget/modals'
import type { ConfirmationModalMessage } from '~/components/ui/ConfirmationModal.vue'
import type { UiMonthData } from '~/components/ui/Month.vue'

interface Props {
  monthKey: string
}

const props = defineProps<Props>()

const budgetStore = useBudgetStore()
const modalsStore = useModalsStore()
const { t } = useI18n()
const { formatMoneyRounded, getRoundedMoneySign } = useMoneyFormat()
const { formatError } = useServerError()
const { toast } = useToast()

const monthData = computed(() => {
  const computed = budgetStore.getComputedMonthByKey(props.monthKey)
  if (!computed) {
    throw new Error(t('budget.month.notFound', { monthKey: props.monthKey }))
  }
  return computed
})

const isReadOnly = computed(() => !budgetStore.canEdit)

const currentMonth = useCurrentMonth()

const isCurrentMonthValue = computed(() =>
  currentMonth.value !== null && isCurrentMonth(monthData.value, currentMonth.value),
)
const isPastMonthValue = computed(() =>
  currentMonth.value !== null && isPastMonth(monthData.value.year, monthData.value.month, currentMonth.value),
)

const rollingAverageExpenses = computed(() => budgetStore.getRollingAverageExpenses())

const uiMonthData = computed((): UiMonthData => ({
  startBalance: monthData.value.startBalance,
  totalIncome: monthData.value.totalIncome,
  totalExpenses: monthData.value.totalExpenses,
  totalOptionalExpenses: monthData.value.totalOptionalExpenses,
  calculatedPocketExpenses: monthData.value.calculatedPocketExpenses,
  totalAllExpenses: monthData.value.totalAllExpenses,
  calculatedBalanceChange: monthData.value.calculatedBalanceChange,
  currencyProfitLoss: monthData.value.currencyProfitLoss,
  plannedBalanceChange: monthData.value.plannedBalanceChange,
  plannedVsActualDiff: monthData.value.plannedVsActualDiff,
  expectedBalance: monthData.value.expectedBalance,
  planComment: monthData.value.planComment,
}))

const monthBadgeTooltip = computed(() => {
  const title = monthData.value.sourceMonthTitle || `${budgetStore.monthNames[monthData.value.month]} ${monthData.value.year}`
  const ratesHint = `${capitalizeFirstLetter(title)} - ${t('budget.month.clickForRates')}`
  const { missingRateCurrencies } = monthData.value
  return missingRateCurrencies.length > 0
    ? `${t('currencyRates.missingRates', { currencies: missingRateCurrencies.join(', ') })} ${ratesHint}`
    : ratesHint
})

const balanceTooltip = computed(() => {
  if (rollingAverageExpenses.value === null || monthData.value.startBalance === null) {
    return t('budget.month.balanceTooltipShort')
  }
  const months = Math.floor(monthData.value.startBalance / rollingAverageExpenses.value)
  return `${t('budget.month.balanceTooltip')} ${months} ${t('budget.month.balanceTooltipMonths')}`
})

const incomeTooltip = computed(() => {
  return `${t('budget.month.incomeTooltip')} ${budgetStore.monthNames[monthData.value.month]} ${monthData.value.year}. ${t('budget.month.incomeTooltipText')}`
})

const expensesTooltip = computed(() => {
  return `${t('budget.month.expensesTooltip')} ${budgetStore.monthNames[monthData.value.month]} ${monthData.value.year}. ${t('budget.month.expensesTooltipText')}`
})

const pocketExpensesTooltip = computed(() => {
  if (monthData.value.calculatedPocketExpenses === null) {
    return t('budget.month.pocketExpensesAvailable')
  }
  if (getAmountSignForDisplay(monthData.value.calculatedPocketExpenses) < 0) {
    return t('budget.month.pocketExpensesError')
  }
  return t('budget.month.pocketExpensesTooltip')
})

const totalExpensesTooltip = computed(() => {
  if (monthData.value.totalAllExpenses === null) {
    return t('budget.month.pocketExpensesAvailable')
  }
  return `${t('budget.month.totalExpensesTooltip')} ${budgetStore.monthNames[monthData.value.month]} ${monthData.value.year}`
})

const balanceChangeTooltip = computed(() => {
  if (monthData.value.calculatedBalanceChange === null) {
    return t('budget.month.pocketExpensesAvailable')
  }
  return `${t('budget.month.balanceChangeTooltip')} ${budgetStore.monthNames[monthData.value.month]} ${monthData.value.year}`
})

const currencyFluctuationTooltip = computed(() => {
  if (monthData.value.currencyProfitLoss === null) {
    return t('budget.month.pocketExpensesAvailable')
  }
  return `${t('budget.month.currencyFluctuationTooltip')} ${budgetStore.monthNames[monthData.value.month]} ${monthData.value.year}`
})

const optionalExpensesTooltip = computed(() => {
  return `${t('budget.month.optionalExpensesTooltip')} ${budgetStore.monthNames[monthData.value.month]} ${monthData.value.year}. ${t('budget.month.optionalExpensesTooltipText')}`
})

const plannedBalanceChangeTooltip = computed(() => {
  if (isPastMonthValue.value && monthData.value.plannedBalanceChange !== null && monthData.value.plannedVsActualDiff !== null) {
    return t('budget.month.plannedVsActualTooltip')
  }
  if (isPastMonthValue.value) {
    return t('budget.month.plannedPastTooltip')
  }
  if (isReadOnly.value) {
    return t('budget.month.plannedReadOnlyTooltip')
  }
  return t('budget.month.plannedTooltip')
})

const expectedBalanceTooltip = computed(() => {
  if (isPastMonthValue.value) {
    return t('budget.month.expectedBalancePastTooltip')
  }
  return t('budget.month.expectedBalanceTooltip')
})

const formatAmountForDisplay = (amount: number): string => {
  return formatMoneyRounded(amount, budgetStore.effectiveMainCurrency)
}

const getAmountSignForDisplay = (amount: number): number =>
  getRoundedMoneySign(amount, budgetStore.effectiveMainCurrency)

const openBalanceModal = (): void => {
  modalsStore.openEntryModal({
    monthId: monthData.value.id,
    entryKind: 'balance',
    isReadOnly: isReadOnly.value,
  })
}

const openIncomeModal = (): void => {
  modalsStore.openEntryModal({
    monthId: monthData.value.id,
    entryKind: 'income',
    isReadOnly: isReadOnly.value,
  })
}

const openExpenseModal = (): void => {
  modalsStore.openEntryModal({
    monthId: monthData.value.id,
    entryKind: 'expense',
    isReadOnly: isReadOnly.value,
  })
}

const openCurrencyRatesModal = (): void => {
  modalsStore.openCurrencyRatesModal({
    monthTitle: `${budgetStore.monthNames[monthData.value.month]} ${monthData.value.year}`,
    rates: monthData.value.exchangeRates,
    isUsingOtherMonthRates: monthData.value.isUsingOtherMonthRates,
    missingRateCurrencies: monthData.value.missingRateCurrencies,
    sourceMonthTitle: monthData.value.sourceMonthTitle,
  })
}

const openPlanModal = (focusField: 'amount' | 'comment' = 'amount'): void => {
  if (isReadOnly.value || isPastMonthValue.value) {
    return
  }
  modalsStore.openPlanModal({
    year: monthData.value.year,
    month: monthData.value.month,
    monthTitle: `${budgetStore.monthNames[monthData.value.month]} ${monthData.value.year}`,
    currentValue: monthData.value.plannedBalanceChange,
    currentComment: monthData.value.planComment,
    focusField,
  })
}

const canDeleteMonth = computed(() => {
  if (isReadOnly.value) {
    return false
  }

  const allMonths = budgetStore.months
  const rawMonthData = allMonths.find(month => month.id === monthData.value.id)
  if (!rawMonthData) {
    return false
  }

  const isFirstAmongLoaded = isFirstMonth(rawMonthData, allMonths)
  const isLastAmongLoaded = isLastMonth(rawMonthData, allMonths)
  const hasMoreYearsToLoad = Boolean(budgetStore.nextYearToLoad)

  return isLastAmongLoaded || (isFirstAmongLoaded && !hasMoreYearsToLoad)
})

const handleDeleteMonth = async (): Promise<void> => {
  const monthName = `${budgetStore.monthNames[monthData.value.month]} ${monthData.value.year}`

  const confirmMessage: ConfirmationModalMessage = [
    t('budget.month.deleteConfirmMessage'),
    { text: monthName, isBold: true },
    t('budget.month.deleteConfirmWillBeDeleted'),
  ]

  const { confirm } = useConfirmation()
  const confirmed = await confirm({
    title: t('budget.month.deleteConfirmTitle'),
    message: confirmMessage,
    variant: 'danger',
    confirmText: t('budget.month.deleteConfirmButton'),
    cancelText: t('common.cancel'),
    icon: 'heroicons:trash',
  })

  if (confirmed) {
    try {
      await budgetStore.deleteMonth(monthData.value.id)
    }
    catch (error) {
      console.error('Error deleting month:', error)
      toast({ type: 'error', message: formatError(error, t('budget.month.deleteError')) })
    }
  }
}
</script>
