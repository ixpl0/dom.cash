<template>
  <li class="hover:bg-base-300/50">
    <hr>
    <div class="timeline-start">
      <h2 class="text-3xl font-bold">
        {{ year }}
      </h2>
    </div>
    <div class="timeline-middle">
      <div class="w-3 h-3 m-1 bg-base-300 rounded-full" />
    </div>
    <div class="timeline-end flex gap-4 pl-4 py-1">
      <div :ref="setHeaderRef(0)">
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top"
            data-tip="Сумма всех сбережений, конвертированных в основную валюту"
          >
            Баланс на начало месяца
          </div>
          <div class="flex flex-col gap-1">
            <div
              class="text-primary font-bold tooltip tooltip-bottom"
              data-tip="Средний баланс на начало месяца за год"
            >
              {{ formatAmountRounded(yearStats.averageBalance, mainCurrency) }}
            </div>
          </div>
        </div>
      </div>

      <div :ref="setHeaderRef(1)">
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top"
            data-tip="Сумма всех доходов, конвертированных в основную валюту"
          >
            Доходы
          </div>
          <div class="flex flex-col gap-1">
            <div
              class="text-success font-bold tooltip tooltip-bottom"
              data-tip="Общая сумма доходов за год"
            >
              {{ formatAmountRounded(yearStats.totalIncome, mainCurrency) }}
            </div>
            <div
              class="text-sm text-success/80 tooltip tooltip-bottom"
              data-tip="Средний доход в месяц"
            >
              {{ formatAmountRounded(yearStats.averageIncome, mainCurrency) }}
            </div>
          </div>
        </div>
      </div>

      <div :ref="setHeaderRef(2)">
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top"
            data-tip="Сумма всех крупных расходов, конвертированных в основную валюту"
          >
            Крупные расходы
          </div>
          <div class="flex flex-col gap-1">
            <div
              class="text-error font-bold tooltip tooltip-bottom"
              data-tip="Общая сумма крупных расходов за год"
            >
              {{ formatAmountRounded(yearStats.totalExpenses, mainCurrency) }}
            </div>
            <div
              class="text-sm text-error/80 tooltip tooltip-bottom"
              data-tip="Средние крупные расходы в месяц"
            >
              {{ formatAmountRounded(yearStats.averageExpenses, mainCurrency) }}
            </div>
          </div>
        </div>
      </div>

      <div :ref="setHeaderRef(3)">
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <!-- eslint-disable no-irregular-whitespace -->
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top"
            data-tip="(Баланс) + (Доходы) + (Валютные колебания) - (Баланс следующего месяца) - (Крупные расходы)"
          >
            Карманные расходы
          </div>
          <!-- eslint-enable no-irregular-whitespace -->
          <div class="flex flex-col gap-1">
            <div
              class="font-bold tooltip tooltip-bottom"
              :class="yearStats.totalPocketExpenses < 0 ? 'text-warning' : 'text-error'"
              data-tip="Общая сумма карманных расходов за год"
            >
              {{ formatAmountRounded(yearStats.totalPocketExpenses, mainCurrency) }}
            </div>
            <div
              class="text-sm tooltip tooltip-bottom"
              :class="yearStats.averagePocketExpenses < 0 ? 'text-warning/80' : 'text-error/80'"
              data-tip="Средние карманные расходы в месяц"
            >
              {{ formatAmountRounded(yearStats.averagePocketExpenses, mainCurrency) }}
            </div>
          </div>
        </div>
      </div>

      <div :ref="setHeaderRef(4)">
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <!-- eslint-disable no-irregular-whitespace -->
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top"
            data-tip="(Крупные расходы) + (Карманные расходы)"
          >
            Все расходы
          </div>
          <!-- eslint-enable no-irregular-whitespace -->
          <div class="flex flex-col gap-1">
            <div
              class="text-error font-bold tooltip tooltip-bottom"
              data-tip="Общая сумма всех расходов за год"
            >
              {{ formatAmountRounded(yearStats.totalAllExpenses, mainCurrency) }}
            </div>
            <div
              class="text-sm text-error/80 tooltip tooltip-bottom"
              data-tip="Средние расходы в месяц"
            >
              {{ formatAmountRounded(yearStats.averageAllExpenses, mainCurrency) }}
            </div>
          </div>
        </div>
      </div>

      <div :ref="setHeaderRef(5)">
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <!-- eslint-disable no-irregular-whitespace -->
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top"
            data-tip="(Баланс на начало месяца) - (Баланс предыдущего месяца)"
          >
            Изменение баланса
          </div>
          <!-- eslint-enable no-irregular-whitespace -->
          <div class="flex flex-col gap-1">
            <div
              class="font-bold tooltip tooltip-bottom"
              :class="{
                'text-success': yearStats.totalBalanceChange > 0,
                'text-error': yearStats.totalBalanceChange < 0,
                'text-base-content': yearStats.totalBalanceChange === 0,
              }"
              data-tip="Общее изменение баланса за год"
            >
              {{ formatAmountRounded(yearStats.totalBalanceChange, mainCurrency) }}
            </div>
            <div
              class="text-sm tooltip tooltip-bottom"
              :class="{
                'text-success/80': yearStats.averageBalanceChange > 0,
                'text-error/80': yearStats.averageBalanceChange < 0,
                'text-base-content/80': yearStats.averageBalanceChange === 0,
              }"
              data-tip="Среднее изменение баланса в месяц"
            >
              {{ formatAmountRounded(yearStats.averageBalanceChange, mainCurrency) }}
            </div>
          </div>
        </div>
      </div>

      <div :ref="setHeaderRef(6)">
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <!-- eslint-disable no-irregular-whitespace -->
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top"
            data-tip="(Баланс следующего месяца) - (Баланс следующего месяца, пересчитанный по курсам текущего месяца)"
          >
            Валютные колебания
          </div>
          <!-- eslint-enable no-irregular-whitespace -->
          <div class="flex flex-col gap-1">
            <div
              class="font-bold tooltip tooltip-bottom"
              :class="{
                'text-success': yearStats.totalCurrencyProfitLoss > 0,
                'text-error': yearStats.totalCurrencyProfitLoss < 0,
                'text-base-content': yearStats.totalCurrencyProfitLoss === 0,
              }"
              data-tip="Общая прибыль/убыток от валютных колебаний за год"
            >
              {{ formatAmountRounded(yearStats.totalCurrencyProfitLoss, mainCurrency) }}
            </div>
            <div
              class="text-sm tooltip tooltip-bottom"
              :class="{
                'text-success/80': yearStats.averageCurrencyProfitLoss > 0,
                'text-error/80': yearStats.averageCurrencyProfitLoss < 0,
                'text-base-content/80': yearStats.averageCurrencyProfitLoss === 0,
              }"
              data-tip="Средние валютные колебания в месяц"
            >
              {{ formatAmountRounded(yearStats.averageCurrencyProfitLoss, mainCurrency) }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <hr>
  </li>

  <BudgetMonth
    v-for="monthData in months"
    :key="`${monthData.year}-${monthData.month}`"
    :month-data="monthData"
    :month-names="monthNames"
    :all-months="allMonths"
    :is-read-only="isReadOnly"
    :target-username="targetUsername"
    :main-currency="mainCurrency"
    :on-delete-month="onDeleteMonth"
    :budget-columns-sync="budgetColumnsSync"
    @added="$emit('refresh')"
    @deleted="$emit('refresh')"
    @updated="$emit('refresh')"
  />
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { MonthData } from '~~/shared/types/budget'
import { formatAmountRounded, calculateTotalBalance } from '~~/shared/utils/budget'

interface Props {
  year: number
  months: MonthData[]
  monthNames: string[]
  allMonths: MonthData[]
  isReadOnly?: boolean
  targetUsername?: string
  mainCurrency?: string
  onDeleteMonth?: (monthId: string) => Promise<void>
  budgetColumnsSync: ReturnType<typeof useBudgetColumnsSync>
}

const props = defineProps<Props>()
defineEmits<{
  refresh: []
}>()

const { mainCurrency: userMainCurrency } = useUser()
const mainCurrency = computed(() => props.mainCurrency || userMainCurrency.value)

const headerRefs = ref<HTMLElement[]>([])

const { registerRow, unregisterRow } = props.budgetColumnsSync

const findNextMonth = (month: MonthData) => {
  return props.allMonths.find(m =>
    (m.year === month.year + 1 && month.month === 11 && m.month === 0)
    || (m.year === month.year && m.month === month.month + 1),
  )
}

const yearStats = computed(() => {
  let totalBalance = 0
  let totalIncome = 0
  let totalExpenses = 0
  let totalPocketExpenses = 0
  let totalBalanceChange = 0
  let totalCurrencyProfitLoss = 0
  let monthCount = 0
  let balanceCount = 0
  let balanceChangeCount = 0
  let currencyCount = 0
  let pocketCount = 0

  props.months.forEach((month) => {
    const currentRates = month.exchangeRates || {}

    const balance = calculateTotalBalance(
      month.balanceSources,
      mainCurrency.value,
      currentRates,
    )

    if (balance > 0) {
      totalBalance += balance
      balanceCount++
    }

    totalIncome += calculateTotalBalance(
      month.incomeEntries,
      mainCurrency.value,
      currentRates,
    )

    totalExpenses += calculateTotalBalance(
      month.expenseEntries,
      mainCurrency.value,
      currentRates,
    )

    const nextMonth = findNextMonth(month)
    if (nextMonth) {
      const nextMonthRates = nextMonth.exchangeRates || {}
      const nextMonthBalance = calculateTotalBalance(
        nextMonth.balanceSources,
        mainCurrency.value,
        nextMonthRates,
      )

      const nextMonthBalanceAtCurrentRates = calculateTotalBalance(
        nextMonth.balanceSources,
        mainCurrency.value,
        currentRates,
      )

      const balanceChange = nextMonthBalance - balance
      totalBalanceChange += balanceChange
      balanceChangeCount++

      const currencyProfitLoss = nextMonthBalance - nextMonthBalanceAtCurrentRates
      totalCurrencyProfitLoss += currencyProfitLoss
      currencyCount++

      const monthIncome = calculateTotalBalance(
        month.incomeEntries,
        mainCurrency.value,
        currentRates,
      )

      const monthExpenses = calculateTotalBalance(
        month.expenseEntries,
        mainCurrency.value,
        currentRates,
      )

      const pocketExpenses = balance + monthIncome - monthExpenses - nextMonthBalanceAtCurrentRates
      totalPocketExpenses += pocketExpenses
      pocketCount++
    }

    monthCount++
  })

  const totalAllExpenses = totalExpenses + totalPocketExpenses

  return {
    averageBalance: balanceCount > 0 ? totalBalance / balanceCount : 0,
    totalIncome,
    averageIncome: monthCount > 0 ? totalIncome / monthCount : 0,
    totalExpenses,
    averageExpenses: monthCount > 0 ? totalExpenses / monthCount : 0,
    totalPocketExpenses,
    averagePocketExpenses: pocketCount > 0 ? totalPocketExpenses / pocketCount : 0,
    totalAllExpenses,
    averageAllExpenses: pocketCount > 0 ? totalAllExpenses / pocketCount : 0,
    totalBalanceChange,
    averageBalanceChange: balanceChangeCount > 0 ? totalBalanceChange / balanceChangeCount : 0,
    totalCurrencyProfitLoss,
    averageCurrencyProfitLoss: currencyCount > 0 ? totalCurrencyProfitLoss / currencyCount : 0,
  }
})

const setHeaderRef = (index: number) => (el: Element | ComponentPublicInstance | null) => {
  if (el && el instanceof HTMLElement) {
    headerRefs.value[index] = el
  }
}

onMounted(() => {
  nextTick(() => {
    const validRefs = headerRefs.value.filter(Boolean)
    if (validRefs.length) {
      registerRow(validRefs)
    }
  })
})

onUnmounted(() => {
  const validRefs = headerRefs.value.filter(Boolean)
  if (validRefs.length) {
    unregisterRow(validRefs)
  }
})
</script>
