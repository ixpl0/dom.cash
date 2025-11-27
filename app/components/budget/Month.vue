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
    :data="uiMonthData"
    :labels="labels"
    :is-current-month="isCurrentMonthValue"
    :is-read-only="isReadOnly"
    :can-delete="canDeleteMonth"
    :format-amount="formatAmountForDisplay"
    @balance-click="openBalanceModal"
    @income-click="openIncomeModal"
    @expense-click="openExpenseModal"
    @currency-rates-click="openCurrencyRatesModal"
    @delete-click="handleDeleteMonth"
  />
</template>

<script setup lang="ts">
import { getErrorMessage } from '~~/shared/utils/errors'
import { formatAmountRounded } from '~~/shared/utils/budget'
import { isFirstMonth, isLastMonth, isCurrentMonth } from '~~/shared/utils/month-helpers'
import { useModalsStore } from '~/stores/modals'
import { useBudgetStore } from '~/stores/budget'
import type { ConfirmationModalMessage } from '~/components/ui/ConfirmationModal.vue'
import type { UiMonthData, UiMonthLabels } from '~/components/ui/Month.vue'

interface Props {
  monthId: string
}

const props = defineProps<Props>()

const budgetStore = useBudgetStore()
const modalsStore = useModalsStore()
const { t } = useI18n()
const { toast } = useToast()

const monthData = computed(() => {
  const computed = budgetStore.getComputedMonthById(props.monthId)
  if (!computed) {
    throw new Error(`Month not found: ${props.monthId}`)
  }
  return computed
})

const isReadOnly = computed(() => !budgetStore.canEdit)
const targetUsername = computed(() => !budgetStore.isOwnBudget ? budgetStore.data?.user?.username : undefined)

const isCurrentMonthValue = ref(false)

onMounted(() => {
  isCurrentMonthValue.value = isCurrentMonth(monthData.value)
})

const averageMonthlyExpenses = computed(() => {
  const yearSummary = budgetStore.getYearSummary(monthData.value.year)
  if (!yearSummary || yearSummary.monthCount === 0) {
    return 3500
  }
  return Math.ceil(yearSummary.avgAllExpenses || 3500)
})

const uiMonthData = computed((): UiMonthData => ({
  startBalance: monthData.value.startBalance,
  totalIncome: monthData.value.totalIncome,
  totalExpenses: monthData.value.totalExpenses,
  totalOptionalExpenses: monthData.value.totalOptionalExpenses,
  calculatedPocketExpenses: monthData.value.calculatedPocketExpenses,
  totalAllExpenses: monthData.value.totalAllExpenses,
  calculatedBalanceChange: monthData.value.calculatedBalanceChange,
  currencyProfitLoss: monthData.value.currencyProfitLoss,
}))

const labels = computed((): UiMonthLabels => ({
  currentMonth: t('budget.month.currentMonth'),
  deleteMonth: t('budget.month.deleteMonth'),
}))

const monthBadgeTooltip = computed(() => {
  const title = monthData.value.sourceMonthTitle || `${budgetStore.monthNames[monthData.value.month]} ${monthData.value.year}`
  return `${title} - ${t('budget.month.clickForRates')}`
})

const balanceTooltip = computed(() => {
  const months = Math.floor(monthData.value.startBalance / averageMonthlyExpenses.value)
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

const canDeleteMonth = computed(() => {
  if (isReadOnly.value) {
    return false
  }

  const rawMonthData = budgetStore.getMonthById(monthData.value.id)
  if (!rawMonthData) {
    return false
  }

  const isFirstAmongLoaded = isFirstMonth(rawMonthData, budgetStore.months)
  const isLastAmongLoaded = isLastMonth(rawMonthData, budgetStore.months)
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
      toast({ type: 'error', message: getErrorMessage(error, t('budget.month.deleteError')) })
    }
  }
}
</script>
