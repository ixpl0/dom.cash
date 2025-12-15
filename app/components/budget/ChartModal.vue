<template>
  <UiDialog
    :is-open="isOpen"
    data-testid="chart-modal"
    content-class="modal-box w-[calc(100vw-2rem)] max-w-6xl h-[90vh] flex flex-col overflow-hidden"
    @close="hide"
  >
    <button
      type="button"
      class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
      data-testid="chart-modal-close-button"
      @click="hide"
    >
      <Icon
        name="heroicons:x-mark"
        size="20"
      />
    </button>

    <h3 class="font-bold text-lg mb-4 flex-shrink-0">
      {{ t('chart.title') }}
    </h3>

    <div class="flex-1 overflow-y-auto overflow-x-auto min-h-0">
      <div class="min-w-[420px] h-full">
        <ClientOnly>
          <BudgetChartClient
            v-if="isOpen"
            :option="chartOption"
            @legend-select-changed="handleLegendSelectChanged"
          />
          <template #fallback>
            <div class="flex items-center justify-center h-full">
              <span class="loading loading-spinner loading-lg" />
            </div>
          </template>
        </ClientOnly>
      </div>
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
import { useBudgetStore } from '~/stores/budget/budget'
import { useModalsStore } from '~/stores/budget/modals'
import { type ChartOption, type TooltipFormatter, buildChartOption, type ChartSeriesConfig } from '~/composables/shared/useChartConfig'
import { getChartThemeColors, type ChartThemeColors } from '~/composables/shared/useChartTheme'
import { formatCurrencyRounded } from '~~/shared/utils/shared/currency-formatter'

type TooltipParams = Parameters<TooltipFormatter>[0]

type SingleParam = TooltipParams extends readonly (infer U)[] ? U : TooltipParams

type TooltipItem = SingleParam & {
  marker?: string
  axisValueLabel?: string
  dataIndex?: number
  name?: string
  seriesName?: string
  value?: number | string | (number | string)[]
}

const toList = (p: TooltipParams): readonly TooltipItem[] =>
  (Array.isArray(p) ? p : [p]) as TooltipItem[]

const toNumber = (v: TooltipItem['value']): number => {
  if (Array.isArray(v)) {
    const last = v.at(-1)
    return typeof last === 'number' ? last : Number(last ?? 0)
  }
  return typeof v === 'number' ? v : Number(v ?? 0)
}

const BudgetChartClient = defineAsyncComponent(() => import('~/components/budget/BudgetChartClient.client.vue'))

const budgetStore = useBudgetStore()
const { t } = useI18n()
const modalsStore = useModalsStore()
const isOpen = computed(() => modalsStore.chartModal.isOpen)

const chartData = computed(() => {
  const months = budgetStore.computedMonths

  const sortedMonths = months.length
    ? [...months].sort((a, b) => {
        if (a.year !== b.year) {
          return a.year - b.year
        }
        return a.month - b.month
      })
    : []

  const labels = sortedMonths.map(month =>
    `${budgetStore.monthNames[month.month]} ${month.year}`,
  )

  const datasets = {
    startBalance: sortedMonths.map(month => month.startBalance),
    totalIncome: sortedMonths.map(month => month.totalIncome),
    totalExpenses: sortedMonths.map(month => month.totalExpenses),
    totalOptionalExpenses: sortedMonths.map(month => month.totalOptionalExpenses),
    calculatedPocketExpenses: sortedMonths.map(month => month.calculatedPocketExpenses || 0),
    allExpenses: sortedMonths.map(month => month.totalAllExpenses || 0),
    currencyProfitLoss: sortedMonths.map(month => month.currencyProfitLoss || 0),
  }

  return { labels, datasets }
})

const formatChartValue = (value: number): string =>
  formatCurrencyRounded(value, budgetStore.effectiveMainCurrency)

const themeColors = ref<ChartThemeColors>(getChartThemeColors())

const LEGEND_STORAGE_KEY = 'budget-chart-legend-selected'

const getDefaultSelected = () => ({
  [t('chart.balance')]: true,
  [t('chart.income')]: true,
  [t('chart.expenses')]: true,
  [t('chart.pocketExpenses')]: false,
  [t('chart.majorExpenses')]: false,
  [t('chart.currencyFluctuations')]: false,
  [t('chart.optionalExpenses')]: false,
})

const loadLegendSelected = () => {
  if (!import.meta.client) {
    return getDefaultSelected()
  }

  try {
    const saved = localStorage.getItem(LEGEND_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...getDefaultSelected(), ...parsed }
    }
  }
  catch {
    // ignore errors
  }

  return getDefaultSelected()
}

const saveLegendSelected = (selected: Record<string, boolean>) => {
  if (!import.meta.client) return

  try {
    localStorage.setItem(LEGEND_STORAGE_KEY, JSON.stringify(selected))
  }
  catch {
    // ignore errors
  }
}

const legendSelected = ref(loadLegendSelected())

const seriesConfigs = computed((): ReadonlyArray<ChartSeriesConfig> => [
  { name: t('chart.balance'), data: chartData.value.datasets.startBalance, colorKey: 'primary' },
  { name: t('chart.income'), data: chartData.value.datasets.totalIncome, colorKey: 'success' },
  { name: t('chart.expenses'), data: chartData.value.datasets.allExpenses, colorKey: 'error' },
  { name: t('chart.pocketExpenses'), data: chartData.value.datasets.calculatedPocketExpenses, colorKey: 'warning' },
  { name: t('chart.majorExpenses'), data: chartData.value.datasets.totalExpenses, colorKey: 'secondary' },
  { name: t('chart.currencyFluctuations'), data: chartData.value.datasets.currencyProfitLoss, colorKey: 'accent' },
  { name: t('chart.optionalExpenses'), data: chartData.value.datasets.totalOptionalExpenses, colorKey: 'info' },
])

const tooltipFormatter = (p: TooltipParams): string => {
  const list = toList(p)
  const idx = list[0]?.dataIndex
  const head = typeof idx === 'number' ? chartData.value.labels[idx] : (list[0]?.name ?? '')

  const body = list
    .map(({ marker = '', seriesName = '', value }) =>
      `${marker}${seriesName}: ${formatChartValue(toNumber(value))}`)
    .join('<br/>')

  return `<strong>${head}</strong><br/>${body}`
}

const yAxisFormatter = (value: number): string => formatChartValue(value)

const chartOption = computed((): ChartOption => {
  const baseOption = buildChartOption({
    colors: themeColors.value,
    labels: chartData.value.labels,
    series: seriesConfigs.value,
    legendSelected: legendSelected.value,
    tooltipFormatter,
    yAxisFormatter,
    enableDataZoom: true,
    gridTop: 80,
    legendTop: 30,
  })

  return {
    ...baseOption,
    grid: {
      ...baseOption.grid,
      right: 50,
    },
  }
})

const handleLegendSelectChanged = (selected: Record<string, boolean>) => {
  legendSelected.value = selected
  saveLegendSelected(selected)
}

const hide = () => {
  modalsStore.closeChartModal()
}

watch(isOpen, (open) => {
  if (open && import.meta.client) {
    themeColors.value = getChartThemeColors()
  }
})
</script>
