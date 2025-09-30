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
            data-tip="Текущий месяц"
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
          :data-tip="`${monthData.sourceMonthTitle || `${budgetStore.monthNames[monthData.month]} ${monthData.year}`} - Нажмите для просмотра курсов валют`"
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
        :data-tip="`Сумма всех сбережений на начало месяца. Этого хватило бы на ${Math.floor(monthData.startBalance / averageMonthlyExpenses)} мес`"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-2xl text-primary"
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
        :data-tip="`Все доходы за ${budgetStore.monthNames[monthData.month]} ${monthData.year}. Это зарплата, бонусы, подарки и т.д.`"
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
        :data-tip="`Все крупные расходы за ${budgetStore.monthNames[monthData.month]} ${monthData.year}. Это оплата квартиры, покупка техники, путешествия и т.д.`"
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
              ? 'Вероятно, вы не добавили все доходы, или по ошибке добавили лишнюю запись в крупные расходы. Ещё может быть связано с неточностями при работе с валютой'
              : 'Всё, что осталось после вычета крупных расходов и валютных колебаний из общих расходов. Это деньги на еду, оплату подписок, мелкие покупки и т.д. Может быть неточным, если вы не добавили все доходы или расходы, или валютные колебания были вычислены неточно.'
          )
          : 'Будет доступно после появления баланса следующего месяца'"
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
          ? `Сумма крупных и карманных расходов за ${budgetStore.monthNames[monthData.month]} ${monthData.year}`
          : 'Будет доступно после появления баланса следующего месяца'"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-xl"
            disabled
            data-testid="total-expenses-button"
            :class="{
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
          ? `Изменение баланса за ${budgetStore.monthNames[monthData.month]} ${monthData.year}`
          : 'Будет доступно после появления баланса следующего месяца'"
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
          ? `Прибыль или убытки от изменения валютных курсов за ${budgetStore.monthNames[monthData.month]} ${monthData.year}`
          : 'Будет доступно после появления баланса следующего месяца'"
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
        :data-tip="`Сумма всех необязательных расходов за ${budgetStore.monthNames[monthData.month]} ${monthData.year}. Это расходы, от которых можно было бы отказаться.`"
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
        data-tip="Удалить месяц"
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
  const confirmMessage = `Все записи месяца <strong>${monthName}</strong> будут безвозвратно удалены.`

  const { confirm } = useConfirmation()
  const confirmed = await confirm({
    title: 'Удаление месяца',
    message: confirmMessage,
    variant: 'danger',
    confirmText: 'Удалить месяц',
    cancelText: 'Отмена',
    icon: 'heroicons:trash',
  })

  if (confirmed) {
    try {
      await budgetStore.deleteMonth(monthData.value.id)
    }
    catch (error) {
      console.error('Error deleting month:', error)
      alert('Не удалось удалить месяц. Попробуйте ещё раз.')
    }
  }
}
</script>
