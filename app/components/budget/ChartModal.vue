<template>
  <dialog
    ref="modal"
    class="modal"
    @close="hide"
  >
    <div class="modal-box w-11/12 max-w-6xl h-[90vh] flex flex-col overflow-hidden">
      <button
        type="button"
        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
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

interface Emits {
  close: []
}

const emit = defineEmits<Emits>()

const budgetStore = useBudgetStore()
const modal = ref<HTMLDialogElement>()
const isOpen = ref(false)

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
    currencyProfitLoss: sortedMonths.map(month => month.currencyProfitLoss || 0),
  }

  return { labels, datasets }
})

const nf = computed(() => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }))

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis' as const,
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
    selected: {
      'Баланс на начало месяца': true,
      'Доходы': true,
      'Крупные расходы': true,
      'Необязательные расходы': false,
      'Карманные расходы': false,
      'Валютные колебания': false,
    },
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
    },
  },
  yAxis: {
    type: 'value' as const,
    axisLabel: {
      formatter: (value: number) => `${Math.round(value)}`,
    },
  },
  dataZoom: [
    {
      type: 'inside' as const,
      start: 0,
      end: 100,
    },
    {
      type: 'slider' as const,
      start: 0,
      end: 100,
      height: 30,
    },
  ],
  series: [
    {
      name: 'Баланс на начало месяца',
      type: 'line' as const,
      data: chartData.value.datasets.startBalance,
      smooth: true,
      lineStyle: { color: '#3b82f6' },
      itemStyle: { color: '#3b82f6' },
      sampling: 'lttb' as const,
      connectNulls: true,
    },
    {
      name: 'Доходы',
      type: 'line' as const,
      data: chartData.value.datasets.totalIncome,
      smooth: true,
      lineStyle: { color: '#22c55e' },
      itemStyle: { color: '#22c55e' },
      sampling: 'lttb' as const,
      connectNulls: true,
    },
    {
      name: 'Крупные расходы',
      type: 'line' as const,
      data: chartData.value.datasets.totalExpenses,
      smooth: true,
      lineStyle: { color: '#ef4444' },
      itemStyle: { color: '#ef4444' },
      sampling: 'lttb' as const,
      connectNulls: true,
    },
    {
      name: 'Необязательные расходы',
      type: 'line' as const,
      data: chartData.value.datasets.totalOptionalExpenses,
      smooth: true,
      lineStyle: { color: '#a855f7' },
      itemStyle: { color: '#a855f7' },
      sampling: 'lttb' as const,
      connectNulls: true,
    },
    {
      name: 'Карманные расходы',
      type: 'line' as const,
      data: chartData.value.datasets.calculatedPocketExpenses,
      smooth: true,
      lineStyle: { color: '#f59e0b' },
      itemStyle: { color: '#f59e0b' },
      sampling: 'lttb' as const,
      connectNulls: true,
    },
    {
      name: 'Валютные колебания',
      type: 'line' as const,
      data: chartData.value.datasets.currencyProfitLoss,
      smooth: true,
      lineStyle: { color: '#6b7280' },
      itemStyle: { color: '#6b7280' },
      sampling: 'lttb' as const,
      connectNulls: true,
    },
  ],
} satisfies ECOption))

const show = () => {
  isOpen.value = true
  modal.value?.showModal()
}

const hide = () => {
  isOpen.value = false
  modal.value?.close()
  emit('close')
}

watch(isOpen, (open) => {
  if (open) {
    modal.value?.showModal()
  }
  else {
    modal.value?.close()
  }
})

defineExpose({ show, hide })
</script>
