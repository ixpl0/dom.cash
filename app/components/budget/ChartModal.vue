<template>
  <dialog
    ref="modal"
    class="modal"
    data-testid="chart-modal"
    @close="hide"
  >
    <div class="modal-box w-11/12 max-w-6xl h-[90vh] flex flex-col overflow-hidden">
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
        График бюджета
      </h3>

      <div class="flex-1 overflow-hidden">
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
    <div
      class="modal-backdrop"
      @click="hide"
    />
  </dialog>
</template>

<script setup lang="ts">
import { useBudgetStore } from '~/stores/budget'
import { useModalsStore } from '~/stores/modals'
import type { ComposeOption } from 'echarts/core'
import type { LineSeriesOption } from 'echarts/charts'
import type { GridComponentOption, LegendComponentOption, TooltipComponentOption, DataZoomComponentOption } from 'echarts/components'

type TooltipParams = Parameters<Exclude<TooltipComponentOption['formatter'], string | undefined>>[0]

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

type ECOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
  | DataZoomComponentOption
>

const BudgetChartClient = defineAsyncComponent(() => import('~/components/budget/BudgetChartClient.client.vue'))

const budgetStore = useBudgetStore()
const modalsStore = useModalsStore()
const modal = ref<HTMLDialogElement>()
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

const nf = computed(() => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }))

const getThemeUIColors = () => {
  if (!import.meta.client) {
    return {
      text: '#6b7280',
      legend: '#374151',
      axis: '#9ca3af',
      grid: '#e5e7eb',
      background: '#f3f4f6',
      primary: '#3b82f6',
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      secondary: '#a855f7',
      accent: '#6b7280',
      info: '#06b6d4',
    }
  }

  const style = getComputedStyle(document.documentElement)
  const baseContent = style.getPropertyValue('--color-base-content').trim()
  const base200 = style.getPropertyValue('--color-base-200').trim()
  const primary = style.getPropertyValue('--color-primary').trim()
  const success = style.getPropertyValue('--color-success').trim()
  const error = style.getPropertyValue('--color-error').trim()
  const warning = style.getPropertyValue('--color-warning').trim()
  const secondary = style.getPropertyValue('--color-secondary').trim()
  const accent = style.getPropertyValue('--color-accent').trim()
  const info = style.getPropertyValue('--color-info').trim()

  return {
    text: baseContent || '#6b7280',
    legend: baseContent || '#374151',
    axis: `color-mix(in srgb, ${baseContent || '#9ca3af'} 70%, transparent)`,
    grid: `color-mix(in srgb, ${baseContent || '#e5e7eb'} 10%, transparent)`,
    background: base200 || '#f3f4f6',
    primary: primary || '#3b82f6',
    success: success || '#22c55e',
    error: error || '#ef4444',
    warning: warning || '#f59e0b',
    secondary: secondary || '#a855f7',
    accent: accent || '#6b7280',
    info: info || '#06b6d4',
  }
}

const themeUIColors = ref(getThemeUIColors())

const LEGEND_STORAGE_KEY = 'budget-chart-legend-selected'

const getDefaultSelected = () => ({
  'Баланс': true,
  'Доходы': true,
  'Расходы': true,
  'Карманные расходы': false,
  'Крупные расходы': false,
  'Валютные колебания': false,
  'Необязательные расходы': false,
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

const chartOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis' as const,
    backgroundColor: themeUIColors.value.background,
    borderColor: themeUIColors.value.axis,
    textStyle: { color: themeUIColors.value.text },
    formatter: (p: TooltipParams) => {
      const list = toList(p)

      const idx = list[0]?.dataIndex
      const head = typeof idx === 'number' ? chartData.value.labels[idx] : (list[0]?.name ?? '')

      const currency = budgetStore.effectiveMainCurrency

      const body = list
        .map(({ marker = '', seriesName = '', value }) =>
          `${marker}${seriesName}: ${nf.value.format(toNumber(value))} ${currency}`)
        .join('<br/>')

      return `<strong>${head}</strong><br/>${body}`
    },
  },
  legend: {
    type: 'scroll' as const,
    top: 30,
    textStyle: { color: themeUIColors.value.legend },
    inactiveColor: themeUIColors.value.axis,
    selected: legendSelected.value,
    lineStyle: { inactiveColor: 'transparent' },
  },
  grid: {
    top: 80,
    left: 50,
    right: 50,
    bottom: 60,
    containLabel: true,
  },
  xAxis: {
    type: 'category' as const,
    data: chartData.value.labels,
    axisLabel: {
      rotate: 45,
      color: themeUIColors.value.axis,
    },
    axisLine: {
      lineStyle: { color: themeUIColors.value.axis },
    },
  },
  yAxis: {
    type: 'value' as const,
    axisLabel: {
      formatter: (value: number) => `${nf.value.format(Math.round(value))} ${budgetStore.effectiveMainCurrency}`,
      color: themeUIColors.value.axis,
    },
    axisLine: {
      lineStyle: { color: themeUIColors.value.axis },
    },
    splitLine: {
      lineStyle: { color: themeUIColors.value.grid },
    },
  },
  dataZoom: [
    {
      type: 'inside' as const,
      start: 0,
      end: 100,
    },
  ],
  series: [
    {
      name: 'Баланс',
      type: 'line' as const,
      data: chartData.value.datasets.startBalance,
      smooth: true,
      lineStyle: { color: themeUIColors.value.primary },
      itemStyle: { color: themeUIColors.value.primary },
      emphasis: {
        lineStyle: { color: themeUIColors.value.primary },
        itemStyle: { color: themeUIColors.value.primary },
      },
      symbol: 'circle',
      symbolSize: 8,
      sampling: 'lttb' as const,
      connectNulls: true,
    },
    {
      name: 'Доходы',
      type: 'line' as const,
      data: chartData.value.datasets.totalIncome,
      smooth: true,
      lineStyle: { color: themeUIColors.value.success },
      itemStyle: { color: themeUIColors.value.success },
      emphasis: {
        lineStyle: { color: themeUIColors.value.success },
        itemStyle: { color: themeUIColors.value.success },
      },
      symbol: 'circle',
      symbolSize: 8,
      sampling: 'lttb' as const,
      connectNulls: true,
    },
    {
      name: 'Расходы',
      type: 'line' as const,
      data: chartData.value.datasets.allExpenses,
      smooth: true,
      lineStyle: { color: themeUIColors.value.error },
      itemStyle: { color: themeUIColors.value.error },
      emphasis: {
        lineStyle: { color: themeUIColors.value.error },
        itemStyle: { color: themeUIColors.value.error },
      },
      symbol: 'circle',
      symbolSize: 8,
      sampling: 'lttb' as const,
      connectNulls: true,
    },
    {
      name: 'Карманные расходы',
      type: 'line' as const,
      data: chartData.value.datasets.calculatedPocketExpenses,
      smooth: true,
      lineStyle: { color: themeUIColors.value.warning },
      itemStyle: { color: themeUIColors.value.warning },
      emphasis: {
        lineStyle: { color: themeUIColors.value.warning },
        itemStyle: { color: themeUIColors.value.warning },
      },
      symbol: 'circle',
      symbolSize: 8,
      sampling: 'lttb' as const,
      connectNulls: true,
    },
    {
      name: 'Крупные расходы',
      type: 'line' as const,
      data: chartData.value.datasets.totalExpenses,
      smooth: true,
      lineStyle: { color: themeUIColors.value.secondary },
      itemStyle: { color: themeUIColors.value.secondary },
      emphasis: {
        lineStyle: { color: themeUIColors.value.secondary },
        itemStyle: { color: themeUIColors.value.secondary },
      },
      symbol: 'circle',
      symbolSize: 8,
      sampling: 'lttb' as const,
      connectNulls: true,
    },
    {
      name: 'Валютные колебания',
      type: 'line' as const,
      data: chartData.value.datasets.currencyProfitLoss,
      smooth: true,
      lineStyle: { color: themeUIColors.value.accent },
      itemStyle: { color: themeUIColors.value.accent },
      emphasis: {
        lineStyle: { color: themeUIColors.value.accent },
        itemStyle: { color: themeUIColors.value.accent },
      },
      symbol: 'circle',
      symbolSize: 8,
      sampling: 'lttb' as const,
      connectNulls: true,
    },
    {
      name: 'Необязательные расходы',
      type: 'line' as const,
      data: chartData.value.datasets.totalOptionalExpenses,
      smooth: true,
      lineStyle: { color: themeUIColors.value.info },
      itemStyle: { color: themeUIColors.value.info },
      emphasis: {
        lineStyle: { color: themeUIColors.value.info },
        itemStyle: { color: themeUIColors.value.info },
      },
      symbol: 'circle',
      symbolSize: 8,
      sampling: 'lttb' as const,
      connectNulls: true,
    },
  ],
} satisfies ECOption))

const handleLegendSelectChanged = (selected: Record<string, boolean>) => {
  legendSelected.value = selected
  saveLegendSelected(selected)
}

const hide = () => {
  modalsStore.closeChartModal()
}

watch(isOpen, (open) => {
  if (open) {
    if (import.meta.client) {
      themeUIColors.value = getThemeUIColors()
    }
    modal.value?.showModal()
  }
  else {
    modal.value?.close()
  }
})
</script>
