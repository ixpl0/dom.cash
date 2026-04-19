<template>
  <UiMonth
    :month-name="budgetStore.monthNames[monthData.month]"
    :month-badge-tooltip="monthBadgeTooltip"
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
    :labels="labels"
    :is-current-month="isCurrentMonthValue"
    :is-read-only="isReadOnly"
    :can-delete="canDeleteMonth"
    :is-planning-mode="budgetStore.isPlanningMode"
    :is-past-month="isPastMonthValue"
    :format-amount="formatAmountForDisplay"
    @balance-click="openBalanceModal"
    @income-click="openIncomeModal"
    @expense-click="openExpenseModal"
    @currency-rates-click="openCurrencyRatesModal"
    @delete-click="handleDeleteMonth"
    @plan-click="openPlanModal"
  />
</template>

<script setup lang="ts">
import { formatAmountRounded } from '~~/shared/utils/budget/budget'
import { isFirstMonth, isLastMonth, isCurrentMonth } from '~~/shared/utils/budget/month-helpers'
import { useBudgetStore } from '~/stores/budget/budget'
import { useModalsStore } from '~/stores/budget/modals'
import type { ConfirmationModalMessage } from '~/components/ui/ConfirmationModal.vue'
import type { UiMonthData, UiMonthLabels } from '~/components/ui/Month.vue'

interface Props {
  monthId: string
}

const props = defineProps<Props>()

const budgetStore = useBudgetStore()
const modalsStore = useModalsStore()
const { t } = useI18n()
const { formatError } = useServerError()
const { toast } = useToast()

const monthData = computed(() => {
  const computed = budgetStore.getComputedMonthById(props.monthId)
  if (!computed) {
    throw new Error(t('budget.month.notFound', { monthId: props.monthId }))
  }
  return computed
})

const isReadOnly = computed(() => !budgetStore.canEdit)
const targetUsername = computed(() => !budgetStore.isOwnBudget ? budgetStore.data?.user?.username : undefined)

const isCurrentMonthValue = ref(false)
const isPastMonthValue = ref(false)

const checkIsPastMonth = (year: number, monthValue: number): boolean => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  if (year < currentYear) {
    return true
  }
  if (year === currentYear && monthValue < currentMonth) {
    return true
  }
  return false
}

onMounted(() => {
  isCurrentMonthValue.value = isCurrentMonth(monthData.value)
  isPastMonthValue.value = checkIsPastMonth(monthData.value.year, monthData.value.month)
})

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
}))

const labels = computed((): UiMonthLabels => ({
  deleteMonth: t('budget.month.deleteMonth'),
  addPlan: t('budget.month.addPlan'),
}))

const monthBadgeTooltip = computed(() => {
  const title = monthData.value.sourceMonthTitle || `${budgetStore.monthNames[monthData.value.month]} ${monthData.value.year}`
  return `${title} - ${t('budget.month.clickForRates')}`
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
  if (monthData.value.calculatedPocketExpenses < 0) {
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
  return formatAmountRounded(amount, budgetStore.effectiveMainCurrency)
}

const openBalanceModal = (): void => {
  modalsStore.openEntryModal({
    monthId: monthData.value.id,
    entryKind: 'balance',
    isReadOnly: isReadOnly.value,
    targetUsername: targetUsername.value,
  })
}

const openIncomeModal = (): void => {
  modalsStore.openEntryModal({
    monthId: monthData.value.id,
    entryKind: 'income',
    isReadOnly: isReadOnly.value,
    targetUsername: targetUsername.value,
  })
}

const openExpenseModal = (): void => {
  modalsStore.openEntryModal({
    monthId: monthData.value.id,
    entryKind: 'expense',
    isReadOnly: isReadOnly.value,
    targetUsername: targetUsername.value,
  })
}

const openCurrencyRatesModal = (): void => {
  modalsStore.openCurrencyRatesModal({
    monthId: Number(monthData.value.id),
    monthTitle: `${budgetStore.monthNames[monthData.value.month]} ${monthData.value.year}`,
    rates: monthData.value.exchangeRates,
    isUsingOtherMonthRates: monthData.value.isUsingOtherMonthRates,
    sourceMonthTitle: monthData.value.sourceMonthTitle,
  })
}

const openPlanModal = (): void => {
  if (isReadOnly.value || isPastMonthValue.value) {
    return
  }
  modalsStore.openPlanModal({
    year: monthData.value.year,
    month: monthData.value.month,
    monthTitle: `${budgetStore.monthNames[monthData.value.month]} ${monthData.value.year}`,
    currentValue: monthData.value.plannedBalanceChange,
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
