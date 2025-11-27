<template>
  <li
    class="hover:bg-base-200"
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
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex"
            :data-tip="labels.balanceTooltip"
          >
            {{ labels.balance }}
          </div>
          <div class="flex flex-col gap-1">
            <div
              class="tooltip tooltip-bottom"
              :class="{
                'text-primary': stats.averageBalance > 0,
                'text-base-content': stats.averageBalance === 0,
              }"
              :data-tip="labels.averageBalance"
              data-testid="year-average-balance"
            >
              <div class="font-bold">
                {{ formatAmount(stats.averageBalance) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div :ref="setHeaderRef(1)">
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex"
            :data-tip="labels.incomeTooltip"
          >
            {{ labels.income }}
          </div>
          <div class="flex flex-col gap-1">
            <div
              class="tooltip tooltip-bottom"
              :class="{
                'text-success': stats.totalIncome > 0,
                'text-base-content': stats.totalIncome === 0,
              }"
              :data-tip="labels.totalIncome"
              data-testid="year-total-income"
            >
              <div class="font-bold">
                {{ formatAmount(stats.totalIncome) }}
              </div>
            </div>
            <div
              class="text-sm tooltip tooltip-bottom"
              :class="{
                'text-success/80': stats.averageIncome > 0,
                'text-base-content/80': stats.averageIncome === 0,
              }"
              :data-tip="labels.averageIncome"
              data-testid="year-average-income"
            >
              {{ formatAmount(stats.averageIncome) }}
            </div>
          </div>
        </div>
      </div>

      <div :ref="setHeaderRef(2)">
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex flex-col"
            :data-tip="labels.majorExpensesTooltip"
          >
            <span>{{ labels.majorExpensesLine1 }}</span>
            <span>{{ labels.majorExpensesLine2 }}</span>
          </div>
          <div class="flex flex-col gap-1">
            <div
              class="tooltip tooltip-bottom"
              :class="{
                'text-error': stats.totalExpenses > 0,
                'text-base-content': stats.totalExpenses === 0,
              }"
              :data-tip="labels.totalMajorExpenses"
              data-testid="year-total-expenses"
            >
              <div class="font-bold">
                {{ formatAmount(stats.totalExpenses) }}
              </div>
            </div>
            <div
              class="text-sm tooltip tooltip-bottom"
              :class="{
                'text-error/80': stats.averageExpenses > 0,
                'text-base-content/80': stats.averageExpenses === 0,
              }"
              :data-tip="labels.averageMajorExpenses"
              data-testid="year-average-expenses"
            >
              {{ formatAmount(stats.averageExpenses) }}
            </div>
          </div>
        </div>
      </div>

      <div :ref="setHeaderRef(3)">
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex flex-col"
            :data-tip="labels.pocketExpensesFormula"
          >
            <span>{{ labels.pocketExpensesLine1 }}</span>
            <span>{{ labels.pocketExpensesLine2 }}</span>
          </div>
          <div class="flex flex-col gap-1">
            <div
              class="tooltip tooltip-bottom"
              :class="{
                'text-warning': stats.totalPocketExpenses < 0,
                'text-error': stats.totalPocketExpenses > 0,
                'text-base-content': stats.totalPocketExpenses === 0,
              }"
              :data-tip="labels.totalPocketExpenses"
              data-testid="year-total-pocket-expenses"
            >
              <div class="font-bold">
                {{ formatAmount(stats.totalPocketExpenses) }}
              </div>
            </div>
            <div
              class="text-sm tooltip tooltip-bottom"
              :class="{
                'text-warning/80': stats.averagePocketExpenses < 0,
                'text-error/80': stats.averagePocketExpenses > 0,
                'text-base-content/80': stats.averagePocketExpenses === 0,
              }"
              :data-tip="labels.averagePocketExpenses"
              data-testid="year-average-pocket-expenses"
            >
              {{ formatAmount(stats.averagePocketExpenses) }}
            </div>
          </div>
        </div>
      </div>

      <div :ref="setHeaderRef(4)">
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex"
            :data-tip="labels.allExpensesFormula"
          >
            {{ labels.allExpenses }}
          </div>
          <div class="flex flex-col gap-1">
            <div
              class="tooltip tooltip-bottom"
              :class="{
                'text-warning': stats.totalAllExpenses < 0,
                'text-error': stats.totalAllExpenses > 0,
                'text-base-content': stats.totalAllExpenses === 0,
              }"
              :data-tip="labels.totalAllExpenses"
              data-testid="year-total-all-expenses"
            >
              <div class="font-bold">
                {{ formatAmount(stats.totalAllExpenses) }}
              </div>
            </div>
            <div
              class="text-sm tooltip tooltip-bottom"
              :class="{
                'text-warning/80': stats.averageAllExpenses < 0,
                'text-error/80': stats.averageAllExpenses > 0,
                'text-base-content/80': stats.averageAllExpenses === 0,
              }"
              :data-tip="labels.averageAllExpenses"
              data-testid="year-average-all-expenses"
            >
              {{ formatAmount(stats.averageAllExpenses) }}
            </div>
          </div>
        </div>
      </div>

      <div :ref="setHeaderRef(5)">
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex flex-col"
            :data-tip="labels.balanceChangeFormula"
          >
            <span>{{ labels.balanceChangeLine1 }}</span>
            <span>{{ labels.balanceChangeLine2 }}</span>
          </div>
          <div class="flex flex-col gap-1">
            <div
              class="tooltip tooltip-bottom"
              :class="{
                'text-success': stats.totalBalanceChange > 0,
                'text-error': stats.totalBalanceChange < 0,
                'text-base-content': stats.totalBalanceChange === 0,
              }"
              :data-tip="labels.totalBalanceChange"
              data-testid="year-total-balance-change"
            >
              <div class="font-bold">
                {{ formatAmount(stats.totalBalanceChange) }}
              </div>
            </div>
            <div
              class="text-sm tooltip tooltip-bottom"
              :class="{
                'text-success/80': stats.averageBalanceChange > 0,
                'text-error/80': stats.averageBalanceChange < 0,
                'text-base-content/80': stats.averageBalanceChange === 0,
              }"
              :data-tip="labels.averageBalanceChange"
              data-testid="year-average-balance-change"
            >
              {{ formatAmount(stats.averageBalanceChange) }}
            </div>
          </div>
        </div>
      </div>

      <div :ref="setHeaderRef(6)">
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex flex-col"
            :data-tip="labels.currencyFluctuationsFormula"
          >
            <span>{{ labels.currencyFluctuationsLine1 }}</span>
            <span>{{ labels.currencyFluctuationsLine2 }}</span>
          </div>
          <div class="flex flex-col gap-1">
            <div
              class="tooltip tooltip-bottom"
              :class="{
                'text-success': stats.totalCurrencyProfitLoss > 0,
                'text-error': stats.totalCurrencyProfitLoss < 0,
                'text-base-content': stats.totalCurrencyProfitLoss === 0,
              }"
              :data-tip="labels.totalCurrencyFluctuations"
              data-testid="year-total-currency-profit-loss"
            >
              <div class="font-bold">
                {{ formatAmount(stats.totalCurrencyProfitLoss) }}
              </div>
            </div>
            <div
              class="text-sm tooltip tooltip-bottom"
              :class="{
                'text-success/80': stats.averageCurrencyProfitLoss > 0,
                'text-error/80': stats.averageCurrencyProfitLoss < 0,
                'text-base-content/80': stats.averageCurrencyProfitLoss === 0,
              }"
              :data-tip="labels.averageCurrencyFluctuations"
              data-testid="year-average-currency-profit-loss"
            >
              {{ formatAmount(stats.averageCurrencyProfitLoss) }}
            </div>
          </div>
        </div>
      </div>

      <div :ref="setHeaderRef(7)">
        <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
          <div
            class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex flex-col"
            :data-tip="labels.optionalExpensesTooltip"
          >
            <span>{{ labels.optionalExpensesLine1 }}</span>
            <span>{{ labels.optionalExpensesLine2 }}</span>
          </div>
          <div class="flex flex-col gap-1">
            <div
              class="tooltip tooltip-bottom"
              :class="{
                'text-error': stats.totalOptionalExpenses > 0,
                'text-base-content': stats.totalOptionalExpenses === 0,
              }"
              :data-tip="labels.totalOptionalExpenses"
              data-testid="year-total-optional-expenses"
            >
              <div class="font-bold">
                {{ formatAmount(stats.totalOptionalExpenses) }}
              </div>
            </div>
            <div
              class="text-sm tooltip tooltip-bottom"
              :class="{
                'text-error/80': stats.averageOptionalExpenses > 0,
                'text-base-content/80': stats.averageOptionalExpenses === 0,
              }"
              :data-tip="labels.averageOptionalExpenses"
              data-testid="year-average-optional-expenses"
            >
              {{ formatAmount(stats.averageOptionalExpenses) }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <hr>
  </li>

  <slot />
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { timelineColumnsSyncKey } from '~/types/timeline'

export interface UiYearStats {
  averageBalance: number
  totalIncome: number
  averageIncome: number
  totalExpenses: number
  averageExpenses: number
  totalOptionalExpenses: number
  averageOptionalExpenses: number
  totalPocketExpenses: number
  averagePocketExpenses: number
  totalAllExpenses: number
  averageAllExpenses: number
  totalBalanceChange: number
  averageBalanceChange: number
  totalCurrencyProfitLoss: number
  averageCurrencyProfitLoss: number
}

export interface UiYearLabels {
  balance: string
  balanceTooltip: string
  averageBalance: string
  income: string
  incomeTooltip: string
  totalIncome: string
  averageIncome: string
  majorExpensesLine1: string
  majorExpensesLine2: string
  majorExpensesTooltip: string
  totalMajorExpenses: string
  averageMajorExpenses: string
  pocketExpensesLine1: string
  pocketExpensesLine2: string
  pocketExpensesFormula: string
  totalPocketExpenses: string
  averagePocketExpenses: string
  allExpenses: string
  allExpensesFormula: string
  totalAllExpenses: string
  averageAllExpenses: string
  balanceChangeLine1: string
  balanceChangeLine2: string
  balanceChangeFormula: string
  totalBalanceChange: string
  averageBalanceChange: string
  currencyFluctuationsLine1: string
  currencyFluctuationsLine2: string
  currencyFluctuationsFormula: string
  totalCurrencyFluctuations: string
  averageCurrencyFluctuations: string
  optionalExpensesLine1: string
  optionalExpensesLine2: string
  optionalExpensesTooltip: string
  totalOptionalExpenses: string
  averageOptionalExpenses: string
}

interface Props {
  year: number
  stats: UiYearStats
  labels: UiYearLabels
  formatAmount: (amount: number) => string
}

defineProps<Props>()

const columnsSync = inject(timelineColumnsSyncKey, null)

const headerRefs = ref<HTMLElement[]>([])

const setHeaderRef = (index: number) => (el: Element | ComponentPublicInstance | null) => {
  if (el && el instanceof HTMLElement) {
    headerRefs.value[index] = el
  }
}

onMounted(() => {
  nextTick(() => {
    const validRefs = headerRefs.value.filter(Boolean)
    if (validRefs.length && columnsSync) {
      columnsSync.registerRow(validRefs)
    }
  })
})

onUnmounted(() => {
  const validRefs = headerRefs.value.filter(Boolean)
  if (validRefs.length && columnsSync) {
    columnsSync.unregisterRow(validRefs)
  }
})
</script>
