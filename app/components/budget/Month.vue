<template>
  <li class="hover:bg-base-300/50">
    <hr>
    <div class="timeline-start">
      <div
        class="tooltip capitalize"
        :data-tip="`${monthNames[monthData.month]} ${monthData.year} - Нажмите для просмотра курсов валют`"
      >
        <button
          class="badge badge-ghost badge-lg uppercase hover:badge-primary cursor-pointer"
          @click="openCurrencyRatesModal"
        >
          {{ monthNames[monthData.month] }}
        </button>
      </div>
    </div>

    <div class="timeline-middle">
      <svg
        class="h-5 w-5"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          clip-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          fill="currentColor"
          fill-rule="evenodd"
        />
      </svg>
    </div>

    <div class="timeline-end flex gap-4 pl-4 py-1">
      <div
        :ref="setCardRef(0)"
        class="tooltip text-center"
        :data-tip="`Сумма всех сбережений на начало месяца. Этого хватило бы на ${Math.floor(startBalance / averageMonthlyExpenses)} мес`"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-2xl text-primary"
            :disabled="isReadOnly"
            @click="openBalanceModal"
          >
            {{ formatAmountRounded(startBalance, effectiveMainCurrency) }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(1)"
        class="tooltip text-center"
        :data-tip="`Все доходы за ${monthNames[monthData.month]} ${monthData.year}. Это зарплата, бонусы, подарки и т.д.`"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-2xl"
            :class="{
              'text-success': totalIncome !== 0,
              'text-base-content': totalIncome === 0,
            }"
            :disabled="isReadOnly"
            @click="openIncomeModal"
          >
            {{ formatAmountRounded(totalIncome, effectiveMainCurrency) }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(2)"
        class="tooltip text-center"
        :data-tip="`Все крупные расходы за ${monthNames[monthData.month]} ${monthData.year}. Это оплата квартиры, покупка техники, путешествия и т.д.`"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-2xl"
            :class="{
              'text-error': totalExpenses !== 0,
              'text-base-content': totalExpenses === 0,
            }"
            :disabled="isReadOnly"
            @click="openExpenseModal"
          >
            {{ formatAmountRounded(totalExpenses, effectiveMainCurrency) }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(3)"
        class="tooltip text-center"
        :data-tip="pocketExpenses !== null
          ? (
            pocketExpenses < 0
              ? 'Вероятно, вы не добавили все доходы, или по ошибке добавили лишнюю запись в крупные расходы. Ещё может быть связано с неточностями при работе с валютой'
              : 'Всё, что осталось после вычета крупных расходов и валютных колебаний из общих расходов. Это деньги на еду, оплату подписок, мелкие покупки и т.д. Может быть неточным, если вы не добавили все доходы или расходы, или валютные колебания были вычислены неточно.'
          )
          : 'Будет доступно после появления баланса следующего месяца'"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-xl"
            disabled
            :class="{
              'text-warning': pocketExpenses !== null && pocketExpenses < 0,
              'text-error': pocketExpenses !== null && pocketExpenses > 0,
              'text-base-content': pocketExpenses === 0,
            }"
          >
            {{ pocketExpenses !== null ? formatAmountRounded(pocketExpenses, effectiveMainCurrency) : '—' }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(4)"
        class="tooltip text-center"
        :data-tip="totalAllExpenses !== null
          ? `Сумма крупных и карманных расходов за ${monthNames[monthData.month]} ${monthData.year}`
          : 'Будет доступно после появления баланса следующего месяца'"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-xl"
            disabled
            :class="{
              'text-error': totalAllExpenses !== null && totalAllExpenses > 0,
              'text-base-content': totalAllExpenses === 0,
            }"
          >
            {{ totalAllExpenses !== null ? formatAmountRounded(totalAllExpenses, effectiveMainCurrency) : '—' }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(5)"
        class="tooltip text-center"
        :data-tip="balanceChange !== null
          ? `Изменение баланса за ${monthNames[monthData.month]} ${monthData.year}`
          : 'Нужен баланс следующего месяца для расчета'"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-xl"
            :class="{
              'text-success': balanceChange !== null && balanceChange > 0,
              'text-error': balanceChange !== null && balanceChange < 0,
              'text-base-content': balanceChange === 0,
            }"
            disabled
          >
            {{ balanceChange !== null ? formatAmountRounded(balanceChange, effectiveMainCurrency) : '—' }}
          </button>
        </div>
      </div>

      <div
        :ref="setCardRef(6)"
        class="tooltip text-center"
        :data-tip="currencyProfitLoss !== null
          ? `Прибыль или убытки от изменения валютных курсов за ${monthNames[monthData.month]} ${monthData.year}`
          : 'Будет доступно после появления баланса следующего месяца'"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost text-xl"
            :class="{
              'text-success': currencyProfitLoss !== null && currencyProfitLoss > 0,
              'text-error': currencyProfitLoss !== null && currencyProfitLoss < 0,
              'text-base-content': currencyProfitLoss === 0,
            }"
            disabled
          >
            {{ currencyProfitLoss !== null ? formatAmountRounded(currencyProfitLoss, effectiveMainCurrency) : '—' }}
          </button>
        </div>
      </div>

      <div
        v-if="canDeleteMonth"
        :ref="setCardRef(7)"
        class="tooltip text-center"
        data-tip="Удалить месяц"
      >
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto">
          <button
            class="btn btn-ghost btn-sm hover:bg-error hover:text-white"
            @click="handleDeleteMonth"
          >
            <svg
              class="w-4 h-4"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <hr>
  </li>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { MonthData } from '~~/shared/types/budget'
import { formatAmountRounded, calculateTotalBalance } from '~~/shared/utils/budget'
import { isFirstMonth, isLastMonth } from '~~/shared/utils/month-helpers'
import { useModalsStore } from '~/stores/modals'

interface Props {
  monthData: MonthData
  monthNames: string[]
  nextMonthBalance?: number | null
  allMonths: MonthData[]
  isReadOnly?: boolean
  targetUsername?: string
  mainCurrency?: string
  onDeleteMonth?: (monthId: string) => Promise<void>
  budgetColumnsSync: ReturnType<typeof useBudgetColumnsSync>
}

const props = defineProps<Props>()

const { mainCurrency: userMainCurrency } = useUser()
const effectiveMainCurrency = computed(() => props.mainCurrency || userMainCurrency.value)
const modalsStore = useModalsStore()

const cardRefs = ref<HTMLElement[]>([])

const { registerRow, unregisterRow, forceSync } = props.budgetColumnsSync

const setCardRef = (index: number) => (el: Element | ComponentPublicInstance | null) => {
  if (el && el instanceof HTMLElement) {
    cardRefs.value[index] = el
  }
}

onMounted(() => {
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

const currentMonthRates = computed(() => {
  return props.monthData.exchangeRates || {}
})

const startBalance = computed(() => {
  return calculateTotalBalance(
    props.monthData.balanceSources,
    effectiveMainCurrency.value,
    currentMonthRates.value,
  )
})

const totalIncome = computed(() => {
  return calculateTotalBalance(
    props.monthData.incomeEntries,
    effectiveMainCurrency.value,
    currentMonthRates.value,
  )
})

const totalExpenses = computed(() => {
  return calculateTotalBalance(
    props.monthData.expenseEntries,
    effectiveMainCurrency.value,
    currentMonthRates.value,
  )
})

const balanceChange = computed(() => {
  if (nextMonthStartBalance.value === null) {
    return null
  }

  return nextMonthStartBalance.value - startBalance.value
})

const findNextMonth = (month: MonthData) => {
  return props.allMonths.find(m =>
    (m.year === month.year + 1 && month.month === 11 && m.month === 0)
    || (m.year === month.year && m.month === month.month + 1),
  )
}

const calculateMonthExpenses = (month: MonthData) => {
  return calculateTotalBalance(
    month.expenseEntries,
    effectiveMainCurrency.value,
    month.exchangeRates || {},
  )
}

const calculatePocketExpenses = (month: MonthData) => {
  const nextMonth = findNextMonth(month)
  if (!nextMonth) return 0

  const startBalance = calculateTotalBalance(
    month.balanceSources,
    effectiveMainCurrency.value,
    month.exchangeRates || {},
  )

  const income = calculateTotalBalance(
    month.incomeEntries,
    effectiveMainCurrency.value,
    month.exchangeRates || {},
  )

  const nextMonthBalance = calculateTotalBalance(
    nextMonth.balanceSources,
    effectiveMainCurrency.value,
    month.exchangeRates || {},
  )

  const monthExpenses = calculateMonthExpenses(month)

  return Math.max(0, startBalance + income - monthExpenses - nextMonthBalance)
}

const calculateTotalMonthExpenses = (month: MonthData) => {
  return calculateMonthExpenses(month) + calculatePocketExpenses(month)
}

const averageMonthlyExpenses = computed(() => {
  if (props.allMonths.length === 0) {
    return 3500
  }

  const totalExpenses = props.allMonths.reduce((sum, month) => {
    return sum + calculateTotalMonthExpenses(month)
  }, 0)

  return Math.ceil(totalExpenses / props.allMonths.length)
})

const nextMonthData = computed(() => {
  const nextMonth = props.monthData.month === 11 ? 0 : props.monthData.month + 1
  const nextYear = props.monthData.month === 11 ? props.monthData.year + 1 : props.monthData.year

  return props.allMonths.find(m => m.year === nextYear && m.month === nextMonth)
})

const nextMonthStartBalance = computed(() => {
  if (!nextMonthData.value) {
    return null
  }

  const nextMonthRates = nextMonthData.value.exchangeRates || {}

  return calculateTotalBalance(
    nextMonthData.value.balanceSources,
    effectiveMainCurrency.value,
    nextMonthRates,
  )
})

const nextMonthBalanceAtCurrentRates = computed(() => {
  if (!nextMonthData.value) {
    return null
  }

  return calculateTotalBalance(
    nextMonthData.value.balanceSources,
    effectiveMainCurrency.value,
    currentMonthRates.value,
  )
})

const currencyProfitLoss = computed(() => {
  if (nextMonthBalanceAtCurrentRates.value === null || nextMonthStartBalance.value === null) {
    return null
  }

  return nextMonthStartBalance.value - nextMonthBalanceAtCurrentRates.value
})

const pocketExpenses = computed(() => {
  if (nextMonthBalanceAtCurrentRates.value === null || currencyProfitLoss.value === null) {
    return null
  }

  return startBalance.value + totalIncome.value - totalExpenses.value - nextMonthBalanceAtCurrentRates.value
})

const totalAllExpenses = computed(() => {
  if (pocketExpenses.value === null) {
    return null
  }

  return totalExpenses.value + pocketExpenses.value
})

watch([startBalance, totalIncome, totalExpenses, balanceChange, pocketExpenses, currencyProfitLoss, totalAllExpenses], () => {
  nextTick(() => {
    forceSync()
  })
}, { flush: 'post' })

const openBalanceModal = (): void => {
  modalsStore.openEntryModal({
    monthId: props.monthData.id,
    entryKind: 'balance',
    isReadOnly: props.isReadOnly || false,
    targetUsername: props.targetUsername,
  })
}

const openIncomeModal = (): void => {
  modalsStore.openEntryModal({
    monthId: props.monthData.id,
    entryKind: 'income',
    isReadOnly: props.isReadOnly || false,
    targetUsername: props.targetUsername,
  })
}

const openExpenseModal = (): void => {
  modalsStore.openEntryModal({
    monthId: props.monthData.id,
    entryKind: 'expense',
    isReadOnly: props.isReadOnly || false,
    targetUsername: props.targetUsername,
  })
}

const openCurrencyRatesModal = (): void => {
  modalsStore.openCurrencyRatesModal({
    monthId: Number(props.monthData.id),
    monthTitle: monthTitle.value,
    rates: effectiveRates.value,
    isUsingOtherMonthRates: isUsingOtherMonthRates.value || false,
    sourceMonthTitle: sourceMonthTitle.value,
  })
}

const monthTitle = computed(() => {
  return `${props.monthNames[props.monthData.month]} ${props.monthData.year}`
})

const effectiveRates = computed(() => {
  return props.monthData.exchangeRates || {}
})

const isUsingOtherMonthRates = computed(() => {
  if (!props.monthData.exchangeRatesSource) {
    return false
  }
  const currentMonthDate = `${props.monthData.year}-${String(props.monthData.month + 1).padStart(2, '0')}-01`
  return props.monthData.exchangeRatesSource !== currentMonthDate
})

const sourceMonthTitle = computed(() => {
  if (!isUsingOtherMonthRates.value || !props.monthData.exchangeRatesSource) {
    return ''
  }

  const parts = props.monthData.exchangeRatesSource.split('-')
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    return ''
  }

  const year = parts[0]
  const month = parts[1]
  const monthIndex = parseInt(month, 10) - 1

  if (isNaN(monthIndex) || monthIndex < 0 || monthIndex >= 12) {
    return ''
  }

  return `${props.monthNames[monthIndex]} ${year}`
})

const canDeleteMonth = computed(() => {
  return !props.isReadOnly && props.onDeleteMonth && (isFirstMonth(props.monthData, props.allMonths) || isLastMonth(props.monthData, props.allMonths))
})

const handleDeleteMonth = async (): Promise<void> => {
  if (!props.onDeleteMonth) return

  const monthName = `${props.monthNames[props.monthData.month]} ${props.monthData.year}`
  const confirmMessage = `Вы уверены, что хотите удалить месяц ${monthName}? Все записи этого месяца будут безвозвратно удалены.`

  if (confirm(confirmMessage)) {
    try {
      await props.onDeleteMonth(props.monthData.id)
    }
    catch (error) {
      console.error('Error deleting month:', error)
      alert('Не удалось удалить месяц. Попробуйте ещё раз.')
    }
  }
}
</script>
