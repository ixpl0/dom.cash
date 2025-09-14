<template>
  <li
    class="hover:bg-base-300/50"
    data-testid="budget-year"
  >
    <hr>
    <div class="timeline-start">
      <h2 class="text-3xl font-bold">
        {{ year }}
      </h2>
    </div>
    <div class="timeline-middle">
      <div class="w-3 h-3 m-1 bg-base-content rounded-full" />
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
              data-testid="year-average-balance"
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
              data-testid="year-total-income"
            >
              {{ formatAmountRounded(yearStats.totalIncome, mainCurrency) }}
            </div>
            <div
              class="text-sm text-success/80 tooltip tooltip-bottom"
              data-tip="Средний доход в месяц"
              data-testid="year-average-income"
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
              data-testid="year-total-expenses"
            >
              {{ formatAmountRounded(yearStats.totalExpenses, mainCurrency) }}
            </div>
            <div
              class="text-sm text-error/80 tooltip tooltip-bottom"
              data-tip="Средние крупные расходы в месяц"
              data-testid="year-average-expenses"
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
            data-tip="(Баланс) + (Доходы) + (Валютные колебания) - (Баланс следующего месяца) - (Крупные расходы)"
          >
            Карманные расходы
          </div>
          <!-- eslint-enable no-irregular-whitespace -->
          <div class="flex flex-col gap-1">
            <div
              class="font-bold tooltip tooltip-bottom"
              :class="yearStats.totalPocketExpenses < 0 ? 'text-warning' : 'text-error'"
              data-tip="Общая сумма карманных расходов за год"
              data-testid="year-total-pocket-expenses"
            >
              {{ formatAmountRounded(yearStats.totalPocketExpenses, mainCurrency) }}
            </div>
            <div
              class="text-sm tooltip tooltip-bottom"
              :class="yearStats.averagePocketExpenses < 0 ? 'text-warning/80' : 'text-error/80'"
              data-tip="Средние карманные расходы в месяц"
              data-testid="year-average-pocket-expenses"
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
            data-tip="(Крупные расходы) + (Карманные расходы)"
          >
            Все расходы
          </div>
          <!-- eslint-enable no-irregular-whitespace -->
          <div class="flex flex-col gap-1">
            <div
              class="text-error font-bold tooltip tooltip-bottom"
              data-tip="Общая сумма всех расходов за год"
              data-testid="year-total-all-expenses"
            >
              {{ formatAmountRounded(yearStats.totalAllExpenses, mainCurrency) }}
            </div>
            <div
              class="text-sm text-error/80 tooltip tooltip-bottom"
              data-tip="Средние расходы в месяц"
              data-testid="year-average-all-expenses"
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
            data-tip="(Баланс на начало месяца) - (Баланс предыдущего месяца)"
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
              data-testid="year-total-balance-change"
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
              data-testid="year-average-balance-change"
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
            data-tip="(Баланс следующего месяца) - (Баланс следующего месяца, пересчитанный по курсам текущего месяца)"
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
              data-testid="year-total-currency-profit-loss"
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
              data-testid="year-average-currency-profit-loss"
            >
              {{ formatAmountRounded(yearStats.averageCurrencyProfitLoss, mainCurrency) }}
            </div>
          </div>
        </div>
      </div>

      <div :ref="setHeaderRef(7)">
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top"
            data-tip="Сумма всех необязательных расходов, конвертированных в основную валюту"
          >
            Необязательные расходы
          </div>
          <div class="flex flex-col gap-1">
            <div
              class="text-error font-bold tooltip tooltip-bottom"
              data-tip="Общая сумма всех необязательных расходов за год"
              data-testid="year-total-optional-expenses"
            >
              {{ formatAmountRounded(yearStats.totalOptionalExpenses, mainCurrency) }}
            </div>
            <div
              class="text-sm text-error/80 tooltip tooltip-bottom"
              data-tip="Средние необязательные расходы в месяц"
              data-testid="year-average-optional-expenses"
            >
              {{ formatAmountRounded(yearStats.averageOptionalExpenses, mainCurrency) }}
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
    :month-id="createMonthId(monthData.year, monthData.month)"
    :budget-columns-sync="budgetColumnsSync"
  />
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { MonthData } from '~~/shared/types/budget'
import { formatAmountRounded } from '~~/shared/utils/budget'
import { createMonthId } from '~~/shared/utils/budget-calculations'
import { useBudgetStore } from '~/stores/budget'

interface Props {
  year: number
  months: MonthData[]
  monthNames: string[]
  budgetColumnsSync: ReturnType<typeof useBudgetColumnsSync>
}

const props = defineProps<Props>()
defineEmits<{
  refresh: []
}>()

const { mainCurrency: userMainCurrency } = useUser()
const budgetStore = useBudgetStore()
const mainCurrency = computed(() => budgetStore.data?.user?.mainCurrency || userMainCurrency.value)

const headerRefs = ref<HTMLElement[]>([])

const { registerRow, unregisterRow } = props.budgetColumnsSync

const yearStats = computed(() => {
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
