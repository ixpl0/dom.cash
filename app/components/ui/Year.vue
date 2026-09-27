<template>
  <div data-testid="budget-year">
    <div
      v-if="isMobileViewport"
      class="collapse collapse-arrow bg-base-200/50 rounded-box mb-2"
    >
      <input type="checkbox">
      <div class="collapse-title flex items-center">
        <h2 class="text-3xl font-bold">
          {{ year }}
        </h2>
      </div>
      <div class="collapse-content">
        <div class="flex flex-col">
          <UiStatRow
            v-for="stat in mobileStats"
            :key="stat.key"
            :label="stat.label"
            :value-text="stat.valueText"
            :value-class="stat.valueClass"
            :secondary-text="stat.secondaryText"
            :secondary-class="stat.secondaryClass"
            :test-id="stat.testId"
          />
        </div>
      </div>
    </div>

    <div
      v-else
      class="w-fit mx-auto rounded-box mb-2"
    >
      <div class="flex items-center gap-4 px-4 py-2">
        <h2 class="text-5xl font-bold w-28 flex-shrink-0">
          {{ year }}
        </h2>

        <div class="flex gap-4">
          <div :ref="setHeaderRef(0)">
            <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
              <div
                class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex justify-center"
                :data-tip="t('budget.year.balanceTooltip')"
              >
                {{ t('budget.year.balance') }}
              </div>
              <div class="flex flex-col gap-1">
                <div
                  class="tooltip tooltip-top"
                  :class="signedValueClass(stats.averageBalance, 'text-primary', 'text-base-content')"
                  :data-tip="t('budget.year.averageBalance')"
                  data-testid="year-average-balance"
                >
                  <div class="font-bold">
                    {{ formatAmount(stats.averageBalance) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="!isPlanningMode"
            :ref="setHeaderRef(1)"
          >
            <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
              <div
                class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex justify-center"
                :data-tip="t('budget.year.incomeTooltip')"
              >
                {{ t('budget.year.income') }}
              </div>
              <div class="flex flex-col gap-1">
                <div
                  class="tooltip tooltip-top"
                  :class="signedValueClass(stats.totalIncome, 'text-success', 'text-base-content')"
                  :data-tip="t('budget.year.totalIncome')"
                  data-testid="year-total-income"
                >
                  <div class="font-bold">
                    {{ formatAmount(stats.totalIncome) }}
                  </div>
                </div>
                <div
                  class="text-sm tooltip tooltip-top"
                  :class="signedValueClass(stats.averageIncome, 'text-success/80', 'text-base-content/80', 'text-base-content/80')"
                  :data-tip="t('budget.year.averageIncome')"
                  data-testid="year-average-income"
                >
                  {{ formatAmount(stats.averageIncome) }}
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="!isPlanningMode"
            :ref="setHeaderRef(2)"
          >
            <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
              <div
                class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex flex-col items-center"
                :data-tip="t('budget.year.majorExpensesTooltip')"
              >
                <span>{{ t('budget.year.majorExpensesLine1') }}</span>
                <span>{{ t('budget.year.majorExpensesLine2') }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <div
                  class="tooltip tooltip-top"
                  :class="signedValueClass(stats.totalExpenses, 'text-error', 'text-base-content')"
                  :data-tip="t('budget.year.totalMajorExpenses')"
                  data-testid="year-total-expenses"
                >
                  <div class="font-bold">
                    {{ formatAmount(stats.totalExpenses) }}
                  </div>
                </div>
                <div
                  class="text-sm tooltip tooltip-top"
                  :class="signedValueClass(stats.averageExpenses, 'text-error/80', 'text-base-content/80', 'text-base-content/80')"
                  :data-tip="t('budget.year.averageMajorExpenses')"
                  data-testid="year-average-expenses"
                >
                  {{ formatAmount(stats.averageExpenses) }}
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="!isPlanningMode"
            :ref="setHeaderRef(3)"
          >
            <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
              <div
                class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex flex-col items-center"
                :data-tip="t('budget.year.pocketExpensesFormula')"
              >
                <span>{{ t('budget.year.pocketExpensesLine1') }}</span>
                <span>{{ t('budget.year.pocketExpensesLine2') }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <div
                  class="tooltip tooltip-top"
                  :class="signedValueClass(stats.totalPocketExpenses, 'text-error', 'text-warning')"
                  :data-tip="t('budget.year.totalPocketExpenses')"
                  data-testid="year-total-pocket-expenses"
                >
                  <div class="font-bold">
                    {{ formatAmount(stats.totalPocketExpenses) }}
                  </div>
                </div>
                <div
                  class="text-sm tooltip tooltip-top"
                  :class="signedValueClass(stats.averagePocketExpenses, 'text-error/80', 'text-warning/80', 'text-base-content/80')"
                  :data-tip="t('budget.year.averagePocketExpenses')"
                  data-testid="year-average-pocket-expenses"
                >
                  {{ formatAmount(stats.averagePocketExpenses) }}
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="!isPlanningMode"
            :ref="setHeaderRef(4)"
          >
            <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
              <div
                class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex justify-center"
                :data-tip="t('budget.year.allExpensesFormula')"
              >
                {{ t('budget.year.allExpenses') }}
              </div>
              <div class="flex flex-col gap-1">
                <div
                  class="tooltip tooltip-top"
                  :class="signedValueClass(stats.totalAllExpenses, 'text-error', 'text-warning')"
                  :data-tip="t('budget.year.totalAllExpenses')"
                  data-testid="year-total-all-expenses"
                >
                  <div class="font-bold">
                    {{ formatAmount(stats.totalAllExpenses) }}
                  </div>
                </div>
                <div
                  class="text-sm tooltip tooltip-top"
                  :class="signedValueClass(stats.averageAllExpenses, 'text-error/80', 'text-warning/80', 'text-base-content/80')"
                  :data-tip="t('budget.year.averageAllExpenses')"
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
                class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex flex-col items-center"
                :data-tip="t('budget.year.balanceChangeFormula')"
              >
                <span>{{ t('budget.year.balanceChangeLine1') }}</span>
                <span>{{ t('budget.year.balanceChangeLine2') }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <div
                  class="tooltip tooltip-top"
                  :class="signedValueClass(stats.totalBalanceChange, 'text-success', 'text-error')"
                  :data-tip="t('budget.year.totalBalanceChange')"
                  data-testid="year-total-balance-change"
                >
                  <div class="font-bold">
                    {{ formatAmount(stats.totalBalanceChange) }}
                  </div>
                </div>
                <div
                  class="text-sm tooltip tooltip-top"
                  :class="signedValueClass(stats.averageBalanceChange, 'text-success/80', 'text-error/80', 'text-base-content/80')"
                  :data-tip="t('budget.year.averageBalanceChange')"
                  data-testid="year-average-balance-change"
                >
                  {{ formatAmount(stats.averageBalanceChange) }}
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="!isPlanningMode"
            :ref="setHeaderRef(6)"
          >
            <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
              <div
                class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex flex-col items-center"
                :data-tip="t('budget.year.currencyFluctuationsFormula')"
              >
                <span>{{ t('budget.year.currencyFluctuationsLine1') }}</span>
                <span>{{ t('budget.year.currencyFluctuationsLine2') }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <div
                  class="tooltip tooltip-top"
                  :class="signedValueClass(stats.totalCurrencyProfitLoss, 'text-success', 'text-error')"
                  :data-tip="t('budget.year.totalCurrencyFluctuations')"
                  data-testid="year-total-currency-profit-loss"
                >
                  <div class="font-bold">
                    {{ formatAmount(stats.totalCurrencyProfitLoss) }}
                  </div>
                </div>
                <div
                  class="text-sm tooltip tooltip-top"
                  :class="signedValueClass(stats.averageCurrencyProfitLoss, 'text-success/80', 'text-error/80', 'text-base-content/80')"
                  :data-tip="t('budget.year.averageCurrencyFluctuations')"
                  data-testid="year-average-currency-profit-loss"
                >
                  {{ formatAmount(stats.averageCurrencyProfitLoss) }}
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="!isPlanningMode"
            :ref="setHeaderRef(7)"
          >
            <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
              <div
                class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex flex-col items-center"
                :data-tip="t('budget.year.optionalExpensesTooltip')"
              >
                <span>{{ t('budget.year.optionalExpensesLine1') }}</span>
                <span>{{ t('budget.year.optionalExpensesLine2') }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <div
                  class="tooltip tooltip-top"
                  :class="signedValueClass(stats.totalOptionalExpenses, 'text-error', 'text-base-content')"
                  :data-tip="t('budget.year.totalOptionalExpenses')"
                  data-testid="year-total-optional-expenses"
                >
                  <div class="font-bold">
                    {{ formatAmount(stats.totalOptionalExpenses) }}
                  </div>
                </div>
                <div
                  class="text-sm tooltip tooltip-top"
                  :class="signedValueClass(stats.averageOptionalExpenses, 'text-error/80', 'text-base-content/80', 'text-base-content/80')"
                  :data-tip="t('budget.year.averageOptionalExpenses')"
                  data-testid="year-average-optional-expenses"
                >
                  {{ formatAmount(stats.averageOptionalExpenses) }}
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="isPlanningMode"
            :ref="setHeaderRef(8)"
          >
            <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
              <div
                class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex flex-col items-center"
                :data-tip="t('budget.year.plannedFormula')"
              >
                <span>{{ t('budget.year.plannedLine1') }}</span>
                <span>{{ t('budget.year.plannedLine2') }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <div
                  class="tooltip tooltip-top"
                  :class="signedValueClass(stats.totalPlannedBalanceChange, 'text-info', 'text-warning')"
                  :data-tip="t('budget.year.totalPlanned')"
                  data-testid="year-total-planned"
                >
                  <div class="font-bold">
                    {{ stats.plannedMonthCount > 0 ? formatAmount(stats.totalPlannedBalanceChange) : '—' }}
                  </div>
                </div>
                <div
                  v-if="stats.plannedDiffMonthCount > 0"
                  class="text-sm tooltip tooltip-top"
                  :class="signedValueClass(stats.totalPlannedVsActualDiff, 'text-success', 'text-error', 'text-base-content/80')"
                  :data-tip="t('budget.year.totalPlannedDiff')"
                  data-testid="year-total-planned-diff"
                >
                  {{ amountSign(stats.totalPlannedVsActualDiff) > 0 ? '+' : '' }}{{ formatAmount(stats.totalPlannedVsActualDiff) }}
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="isPlanningMode"
            :ref="setHeaderRef(9)"
          >
            <div class="column-content w-fit whitespace-nowrap overflow-visible mx-auto text-center">
              <div
                class="text-sm text-base-content/70 font-semibold tooltip tooltip-top h-12 flex flex-col items-center"
                :data-tip="t('budget.year.expectedBalanceTooltip')"
              >
                <span>{{ t('budget.year.expectedBalanceLine1') }}</span>
                <span>{{ t('budget.year.expectedBalanceLine2') }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <div
                  class="tooltip tooltip-top"
                  :class="signedValueClass(stats.endOfYearExpectedBalance, 'text-primary', 'text-error')"
                  :data-tip="t('budget.year.endOfYearExpectedBalance')"
                  data-testid="year-end-expected-balance"
                >
                  <div class="font-bold">
                    {{ stats.endOfYearExpectedBalance !== null ? formatAmount(stats.endOfYearExpectedBalance) : '—' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="isPlanningMode"
            :ref="setHeaderRef(10)"
          >
            <div class="column-content w-fit max-w-xs mx-auto px-2 text-center">
              <div class="text-sm text-base-content/70 font-semibold h-12 flex items-center justify-center">
                {{ t('budget.year.planComment') }}
              </div>
            </div>
          </div>

          <div
            :ref="setHeaderRef(11)"
            class="w-10"
          />
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2 mb-4">
      <slot />
    </div>
  </div>
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
  totalPlannedBalanceChange: number
  totalPlannedVsActualDiff: number
  plannedMonthCount: number
  plannedDiffMonthCount: number
  endOfYearExpectedBalance: number | null
}

interface Props {
  year: number
  stats: UiYearStats
  formatAmount: (amount: number) => string
  amountSign: (amount: number) => number
  isPlanningMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPlanningMode: false,
})

const { t } = useI18n()

const { isMobileViewport } = useIsMobileViewport()

interface YearStatItem {
  key: string
  label: string
  valueText: string
  valueClass: string
  secondaryText?: string
  secondaryClass?: string
  testId?: string
}

const signedValueClass = (
  value: number | null,
  positiveClass: string,
  negativeClass: string,
  zeroClass: string = 'text-base-content',
): string => {
  const sign = value === null ? 0 : props.amountSign(value)
  if (sign > 0) {
    return positiveClass
  }
  if (sign < 0) {
    return negativeClass
  }
  return zeroClass
}

const mobileStats = computed((): YearStatItem[] => {
  const balanceStat: YearStatItem = {
    key: 'balance',
    label: t('budget.year.balance'),
    valueText: props.formatAmount(props.stats.averageBalance),
    valueClass: signedValueClass(props.stats.averageBalance, 'text-primary', 'text-primary'),
    testId: 'year-average-balance',
  }

  const balanceChangeStat: YearStatItem = {
    key: 'balanceChange',
    label: `${t('budget.year.balanceChangeLine1')} ${t('budget.year.balanceChangeLine2')}`,
    valueText: props.formatAmount(props.stats.totalBalanceChange),
    valueClass: signedValueClass(props.stats.totalBalanceChange, 'text-success', 'text-error'),
    secondaryText: props.formatAmount(props.stats.averageBalanceChange),
    secondaryClass: signedValueClass(props.stats.averageBalanceChange, 'text-success/80', 'text-error/80'),
    testId: 'year-total-balance-change',
  }

  if (props.isPlanningMode) {
    return [
      balanceStat,
      balanceChangeStat,
      {
        key: 'planned',
        label: `${t('budget.year.plannedLine1')} ${t('budget.year.plannedLine2')}`,
        valueText: props.stats.plannedMonthCount > 0 ? props.formatAmount(props.stats.totalPlannedBalanceChange) : '—',
        valueClass: signedValueClass(props.stats.totalPlannedBalanceChange, 'text-info', 'text-warning'),
        secondaryText: props.stats.plannedDiffMonthCount > 0
          ? `${props.amountSign(props.stats.totalPlannedVsActualDiff) > 0 ? '+' : ''}${props.formatAmount(props.stats.totalPlannedVsActualDiff)}`
          : '',
        secondaryClass: signedValueClass(props.stats.totalPlannedVsActualDiff, 'text-success', 'text-error'),
        testId: 'year-total-planned',
      },
      {
        key: 'expectedBalance',
        label: `${t('budget.year.expectedBalanceLine1')} ${t('budget.year.expectedBalanceLine2')}`,
        valueText: props.stats.endOfYearExpectedBalance !== null ? props.formatAmount(props.stats.endOfYearExpectedBalance) : '—',
        valueClass: signedValueClass(props.stats.endOfYearExpectedBalance, 'text-primary', 'text-error'),
        testId: 'year-end-expected-balance',
      },
    ]
  }

  return [
    balanceStat,
    {
      key: 'income',
      label: t('budget.year.income'),
      valueText: props.formatAmount(props.stats.totalIncome),
      valueClass: signedValueClass(props.stats.totalIncome, 'text-success', 'text-success'),
      secondaryText: props.formatAmount(props.stats.averageIncome),
      secondaryClass: signedValueClass(props.stats.averageIncome, 'text-success/80', 'text-success/80'),
      testId: 'year-total-income',
    },
    {
      key: 'majorExpenses',
      label: `${t('budget.year.majorExpensesLine1')} ${t('budget.year.majorExpensesLine2')}`,
      valueText: props.formatAmount(props.stats.totalExpenses),
      valueClass: signedValueClass(props.stats.totalExpenses, 'text-error', 'text-error'),
      secondaryText: props.formatAmount(props.stats.averageExpenses),
      secondaryClass: signedValueClass(props.stats.averageExpenses, 'text-error/80', 'text-error/80'),
      testId: 'year-total-expenses',
    },
    {
      key: 'pocketExpenses',
      label: `${t('budget.year.pocketExpensesLine1')} ${t('budget.year.pocketExpensesLine2')}`,
      valueText: props.formatAmount(props.stats.totalPocketExpenses),
      valueClass: signedValueClass(props.stats.totalPocketExpenses, 'text-error', 'text-warning'),
      secondaryText: props.formatAmount(props.stats.averagePocketExpenses),
      secondaryClass: signedValueClass(props.stats.averagePocketExpenses, 'text-error/80', 'text-warning/80'),
      testId: 'year-total-pocket-expenses',
    },
    {
      key: 'allExpenses',
      label: t('budget.year.allExpenses'),
      valueText: props.formatAmount(props.stats.totalAllExpenses),
      valueClass: signedValueClass(props.stats.totalAllExpenses, 'text-error', 'text-warning'),
      secondaryText: props.formatAmount(props.stats.averageAllExpenses),
      secondaryClass: signedValueClass(props.stats.averageAllExpenses, 'text-error/80', 'text-warning/80'),
      testId: 'year-total-all-expenses',
    },
    balanceChangeStat,
    {
      key: 'currencyFluctuations',
      label: `${t('budget.year.currencyFluctuationsLine1')} ${t('budget.year.currencyFluctuationsLine2')}`,
      valueText: props.formatAmount(props.stats.totalCurrencyProfitLoss),
      valueClass: signedValueClass(props.stats.totalCurrencyProfitLoss, 'text-success', 'text-error'),
      secondaryText: props.formatAmount(props.stats.averageCurrencyProfitLoss),
      secondaryClass: signedValueClass(props.stats.averageCurrencyProfitLoss, 'text-success/80', 'text-error/80'),
      testId: 'year-total-currency-profit-loss',
    },
    {
      key: 'optionalExpenses',
      label: `${t('budget.year.optionalExpensesLine1')} ${t('budget.year.optionalExpensesLine2')}`,
      valueText: props.formatAmount(props.stats.totalOptionalExpenses),
      valueClass: signedValueClass(props.stats.totalOptionalExpenses, 'text-error', 'text-error'),
      secondaryText: props.formatAmount(props.stats.averageOptionalExpenses),
      secondaryClass: signedValueClass(props.stats.averageOptionalExpenses, 'text-error/80', 'text-error/80'),
      testId: 'year-total-optional-expenses',
    },
  ]
})

const columnsSync = inject(timelineColumnsSyncKey, null)

const headerRefs = ref<HTMLElement[]>([])
let registeredHeaderRefs: HTMLElement[] | null = null

const setHeaderRef = (index: number) => (el: Element | ComponentPublicInstance | null) => {
  if (el && el instanceof HTMLElement) {
    headerRefs.value[index] = el
  }
  else {
    headerRefs.value[index] = null as unknown as HTMLElement
  }
}

const registerCurrent = () => {
  if (!columnsSync) {
    return
  }
  const validRefs = headerRefs.value.filter(Boolean)
  if (validRefs.length) {
    columnsSync.registerRow(validRefs)
    registeredHeaderRefs = validRefs
  }
}

const unregisterCurrent = () => {
  if (!columnsSync || !registeredHeaderRefs) {
    return
  }
  columnsSync.unregisterRow(registeredHeaderRefs)
  registeredHeaderRefs = null
}

onMounted(() => {
  nextTick(() => {
    registerCurrent()
  })
})

onUnmounted(() => {
  unregisterCurrent()
})

watch([() => props.isPlanningMode, isMobileViewport], async () => {
  unregisterCurrent()
  headerRefs.value = []
  await nextTick()
  registerCurrent()
})
</script>
