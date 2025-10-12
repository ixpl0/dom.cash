<template>
  <li
    class="hover:bg-base-200"
    data-testid="budget-month"
  >
    <hr>
    <div class="timeline-start">
      <div class="flex items-center gap-1">
        <Transition
          enter-active-class="transition-opacity duration-200"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
        >
          <div
            v-if="isCurrentMonthValue"
            class="tooltip flex items-center justify-center"
            :data-tip="t('budget.month.currentMonth')"
          >
            <Icon
              name="heroicons:play-solid"
              size="14"
              class="text-primary"
            />
          </div>
        </Transition>
        <div
          class="tooltip capitalize"
          :data-tip="`${monthData.sourceMonthTitle || `${budgetStore.monthNames[monthData.month]} ${monthData.year}`} - ${t('budget.month.clickForRates')}`"
        >
          <button
            class="badge badge-ghost badge-lg uppercase hover:badge-primary cursor-pointer"
            data-testid="month-badge"
            @click="openCurrencyRatesModal"
          >
            {{ budgetStore.monthNames[monthData.month] }}
          </button>
        </div>
      </div>
    </div>

    <div class="timeline-middle">
      <Icon
        name="heroicons:check-circle-solid"
        size="20"
      />
    </div>

    <div class="timeline-end flex gap-4 pl-4 py-1">
      <div
        :ref="setCardRef(0)"
        class="tooltip text-center"
        :data-tip="`${t('budget.month.balanceTooltip')} ${Math.floor(monthData.startBalance / averageMonthlyExpenses)} ${t('budget.month.balanceTooltipMonths')}`"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-2xl"
            :class="{
              'text-primary': monthData.startBalance !== 0,
              'text-base-content': monthData.startBalance === 0,
            }"
            :disabled="isReadOnly"
            data-testid="balance-button"
            @click="openBalanceModal"
          >
            {{ formatAmountRounded(monthData.startBalance, budgetStore.effectiveMainCurrency) }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(1)"
        class="tooltip text-center"
        :data-tip="`${t('budget.month.incomeTooltip')} ${budgetStore.monthNames[monthData.month]} ${monthData.year}. ${t('budget.month.incomeTooltipText')}`"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-2xl"
            :class="{
              'text-success': monthData.totalIncome !== 0,
              'text-base-content': monthData.totalIncome === 0,
            }"
            :disabled="isReadOnly"
            data-testid="incomes-button"
            @click="openIncomeModal"
          >
            {{ formatAmountRounded(monthData.totalIncome, budgetStore.effectiveMainCurrency) }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(2)"
        class="tooltip text-center"
        :data-tip="`${t('budget.month.expensesTooltip')} ${budgetStore.monthNames[monthData.month]} ${monthData.year}. ${t('budget.month.expensesTooltipText')}`"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-2xl"
            :class="{
              'text-error': monthData.totalExpenses !== 0,
              'text-base-content': monthData.totalExpenses === 0,
            }"
            :disabled="isReadOnly"
            data-testid="expenses-button"
            @click="openExpenseModal"
          >
            {{ formatAmountRounded(monthData.totalExpenses, budgetStore.effectiveMainCurrency) }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(3)"
        class="tooltip text-center"
        :data-tip="monthData.calculatedPocketExpenses !== null
          ? (
            monthData.calculatedPocketExpenses < 0
              ? t('budget.month.pocketExpensesError')
              : t('budget.month.pocketExpensesTooltip')
          )
          : t('budget.month.pocketExpensesAvailable')"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-xl"
            disabled
            data-testid="pocket-expenses-button"
            :class="{
              'text-warning': monthData.calculatedPocketExpenses !== null && monthData.calculatedPocketExpenses < 0,
              'text-error': monthData.calculatedPocketExpenses !== null && monthData.calculatedPocketExpenses > 0,
              'text-base-content': monthData.calculatedPocketExpenses === 0,
            }"
          >
            {{ monthData.calculatedPocketExpenses !== null ? formatAmountRounded(monthData.calculatedPocketExpenses, budgetStore.effectiveMainCurrency) : '—' }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(4)"
        class="tooltip text-center"
        :data-tip="monthData.totalAllExpenses !== null
          ? `${t('budget.month.totalExpensesTooltip')} ${budgetStore.monthNames[monthData.month]} ${monthData.year}`
          : t('budget.month.pocketExpensesAvailable')"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-xl"
            disabled
            data-testid="total-expenses-button"
            :class="{
              'text-warning': monthData.totalAllExpenses !== null && monthData.totalAllExpenses < 0,
              'text-error': monthData.totalAllExpenses !== null && monthData.totalAllExpenses > 0,
              'text-base-content': monthData.totalAllExpenses === 0,
            }"
          >
            {{ monthData.totalAllExpenses !== null ? formatAmountRounded(monthData.totalAllExpenses, budgetStore.effectiveMainCurrency) : '—' }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(5)"
        class="tooltip text-center"
        :data-tip="monthData.calculatedBalanceChange !== null
          ? `${t('budget.month.balanceChangeTooltip')} ${budgetStore.monthNames[monthData.month]} ${monthData.year}`
          : t('budget.month.pocketExpensesAvailable')"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-xl"
            data-testid="balance-change-button"
            :class="{
              'text-success': monthData.calculatedBalanceChange !== null && monthData.calculatedBalanceChange > 0,
              'text-error': monthData.calculatedBalanceChange !== null && monthData.calculatedBalanceChange < 0,
              'text-base-content': monthData.calculatedBalanceChange === 0,
            }"
            disabled
          >
            {{ monthData.calculatedBalanceChange !== null ? formatAmountRounded(monthData.calculatedBalanceChange, budgetStore.effectiveMainCurrency) : '—' }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(6)"
        class="tooltip text-center"
        :data-tip="monthData.currencyProfitLoss !== null
          ? `${t('budget.month.currencyFluctuationTooltip')} ${budgetStore.monthNames[monthData.month]} ${monthData.year}`
          : t('budget.month.pocketExpensesAvailable')"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-xl"
            data-testid="currency-fluctuation-button"
            :class="{
              'text-success': monthData.currencyProfitLoss !== null && monthData.currencyProfitLoss > 0,
              'text-error': monthData.currencyProfitLoss !== null && monthData.currencyProfitLoss < 0,
              'text-base-content': monthData.currencyProfitLoss === 0,
            }"
            disabled
          >
            {{ monthData.currencyProfitLoss !== null ? formatAmountRounded(monthData.currencyProfitLoss, budgetStore.effectiveMainCurrency) : '—' }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(7)"
        class="tooltip text-center"
        :data-tip="`${t('budget.month.optionalExpensesTooltip')} ${budgetStore.monthNames[monthData.month]} ${monthData.year}. ${t('budget.month.optionalExpensesTooltipText')}`"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-xl"
            data-testid="optional-expenses-button"
            :class="{
              'text-error': monthData.totalOptionalExpenses !== 0,
              'text-base-content': monthData.totalOptionalExpenses === 0,
            }"
            disabled
          >
            {{ formatAmountRounded(monthData.totalOptionalExpenses, budgetStore.effectiveMainCurrency) }}
          </button>
        </div>
      </div>

      <div
        v-if="canDeleteMonth"
        :ref="setCardRef(8)"
        class="tooltip text-center"
        :data-tip="t('budget.month.deleteMonth')"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost btn-sm hover:bg-error hover:text-white"
            data-testid="delete-month-button"
            @click="handleDeleteMonth"
          >
            <Icon
              name="heroicons:trash"
              size="16"
            />
          </button>
        </div>
      </div>
    </div>

    <hr>
  </li>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { getErrorMessage } from '~~/shared/utils/errors'
import { formatAmountRounded } from '~~/shared/utils/budget'
import { isFirstMonth, isLastMonth, isCurrentMonth } from '~~/shared/utils/month-helpers'
import { useModalsStore } from '~/stores/modals'
import { useBudgetStore } from '~/stores/budget'

interface Props {
  monthId: string
  budgetColumnsSync: ReturnType<typeof useBudgetColumnsSync>
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

const cardRefs = ref<HTMLElement[]>([])
const isCurrentMonthValue = ref(false)

const { registerRow, unregisterRow, forceSync } = props.budgetColumnsSync

const setCardRef = (index: number) => (el: Element | ComponentPublicInstance | null) => {
  if (el && el instanceof HTMLElement) {
    cardRefs.value[index] = el
  }
}

onMounted(() => {
  isCurrentMonthValue.value = isCurrentMonth(monthData.value)

  nextTick(() => {
    const validRefs = cardRefs.value.filter(Boolean)
    if (validRefs.length) {
      registerRow(validRefs)
    }
  })
})

onUnmounted(() => {
  const validRefs = cardRefs.value.filter(Boolean)
  if (validRefs.length) {
    unregisterRow(validRefs)
  }
})

const averageMonthlyExpenses = computed(() => {
  const yearSummary = budgetStore.getYearSummary(monthData.value.year)
  if (!yearSummary || yearSummary.monthCount === 0) {
    return 3500
  }
  return Math.ceil(yearSummary.avgAllExpenses || 3500)
})

watch([
  () => monthData.value.startBalance,
  () => monthData.value.totalIncome,
  () => monthData.value.totalExpenses,
  () => monthData.value.totalOptionalExpenses,
  () => monthData.value.calculatedBalanceChange,
  () => monthData.value.calculatedPocketExpenses,
  () => monthData.value.currencyProfitLoss,
  () => monthData.value.totalAllExpenses,
], () => {
  nextTick(() => {
    forceSync()
  })
}, { flush: 'post' })

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
  const confirmMessage = `${t('budget.month.deleteConfirmMessage')} <strong>${monthName}</strong> ${t('budget.month.deleteConfirmWillBeDeleted')}`

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
