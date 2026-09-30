<template>
  <UiDialog
    :is-open="isOpen"
    data-testid="chart-modal"
    content-class="modal-box sm:h-[90vh] sm:w-[calc(100vw-2rem)] sm:max-w-6xl flex flex-col overflow-hidden"
    :title="t('chart.title')"
    close-button-test-id="chart-modal-close-button"
    @close="hide"
  >
    <div class="flex-1 overflow-y-auto min-h-0">
      <div class="h-full">
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
import { useChartTheme } from '~/composables/shared/useChartTheme'

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

const hasValue = (value: TooltipItem['value']): boolean =>
  value !== null && value !== undefined && value !== '-'

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
const { formatMoneyRounded } = useMoneyFormat()
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
    startBalance: sortedMonths.map(month => month.startBalance ?? null),
    totalIncome: sortedMonths.map(month => month.totalIncome),
    totalExpenses: sortedMonths.map(month => month.totalExpenses),
    totalOptionalExpenses: sortedMonths.map(month => month.totalOptionalExpenses),
    calculatedPocketExpenses: sortedMonths.map(month => month.calculatedPocketExpenses ?? null),
    allExpenses: sortedMonths.map(month => month.totalAllExpenses ?? null),
    currencyProfitLoss: sortedMonths.map(month => month.currencyProfitLoss ?? null),
  }

  return { labels, datasets }
})

const formatChartValue = (value: number): string =>
  formatMoneyRounded(value, budgetStore.effectiveMainCurrency)

const { colors: themeColors } = useChartTheme()

const SERIES = [
  { key: 'balance', dataset: 'startBalance', colorKey: 'primary', type: 'line', isShownByDefault: true },
  { key: 'income', dataset: 'totalIncome', colorKey: 'success', type: 'bar', isShownByDefault: true },
  { key: 'expenses', dataset: 'allExpenses', colorKey: 'error', type: 'bar', isShownByDefault: true },
  { key: 'pocketExpenses', dataset: 'calculatedPocketExpenses', colorKey: 'warning', type: 'line', isShownByDefault: false },
  { key: 'majorExpenses', dataset: 'totalExpenses', colorKey: 'secondary', type: 'line', isShownByDefault: false },
  { key: 'currencyFluctuations', dataset: 'currencyProfitLoss', colorKey: 'accent', type: 'line', isShownByDefault: false },
  { key: 'optionalExpenses', dataset: 'totalOptionalExpenses', colorKey: 'info', type: 'line', isShownByDefault: false },
] as const

type SeriesKey = typeof SERIES[number]['key']
type ShownSeries = Record<SeriesKey, boolean>

const SHOWN_SERIES_STORAGE_KEY = 'budget-chart-shown-series'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const toShownSeries = (readShown: (key: SeriesKey, isShownByDefault: boolean) => boolean): ShownSeries =>
  Object.fromEntries(SERIES.map(({ key, isShownByDefault }) => [key, readShown(key, isShownByDefault)])) as ShownSeries

const loadShownSeries = (): ShownSeries => {
  if (!import.meta.client) {
    return toShownSeries((_, isShownByDefault) => isShownByDefault)
  }

  try {
    const saved: unknown = JSON.parse(localStorage.getItem(SHOWN_SERIES_STORAGE_KEY) ?? '{}')
    return toShownSeries((key, isShownByDefault) => {
      const savedValue = isRecord(saved) ? saved[key] : undefined
      return typeof savedValue === 'boolean' ? savedValue : isShownByDefault
    })
  }
  catch {
    return toShownSeries((_, isShownByDefault) => isShownByDefault)
  }
}

const saveShownSeries = (shownSeries: ShownSeries): void => {
  try {
    localStorage.setItem(SHOWN_SERIES_STORAGE_KEY, JSON.stringify(shownSeries))
  }
  catch (error) {
    console.warn('Failed to save the chart series', error)
  }
}

let shownSeries = loadShownSeries()

const getSeriesName = (key: SeriesKey): string => t(`chart.${key}`)

const seriesConfigs = computed((): ReadonlyArray<ChartSeriesConfig> =>
  SERIES.map(({ key, dataset, colorKey, type }) => ({
    name: getSeriesName(key),
    data: chartData.value.datasets[dataset],
    colorKey,
    type,
  })),
)

const getLegendSelected = (): Record<string, boolean> =>
  Object.fromEntries(SERIES.map(({ key }) => [getSeriesName(key), shownSeries[key]]))

const tooltipFormatter = (p: TooltipParams): string => {
  const list = toList(p)
  const idx = list[0]?.dataIndex
  const head = typeof idx === 'number' ? chartData.value.labels[idx] : (list[0]?.name ?? '')

  const body = list
    .filter(({ value }) => hasValue(value))
    .map(({ marker = '', seriesName = '', value }) =>
      `${marker}${seriesName}: ${formatChartValue(toNumber(value))}`)
    .join('<br/>')

  return `<strong>${head}</strong><br/>${body}`
}

const yAxisFormatter = (value: number): string => formatChartValue(value)

const chartOption = computed((): ChartOption => {
  if (!isOpen.value) {
    return {}
  }

  const baseOption = buildChartOption({
    colors: themeColors.value,
    labels: chartData.value.labels,
    series: seriesConfigs.value,
    legendSelected: getLegendSelected(),
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

const handleLegendSelectChanged = (selected: Record<string, boolean>): void => {
  shownSeries = toShownSeries(key => selected[getSeriesName(key)] ?? shownSeries[key])
  saveShownSeries(shownSeries)
}

const hide = () => {
  modalsStore.closeChartModal()
}
</script>
