import type { ComposeOption } from 'echarts/core'
import type { LineSeriesOption } from 'echarts/charts'
import type { GridComponentOption, LegendComponentOption, TooltipComponentOption, DataZoomComponentOption } from 'echarts/components'
import type { ChartThemeColors } from './useChartTheme'

export type ChartOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
  | DataZoomComponentOption
>

export type TooltipFormatter = Exclude<TooltipComponentOption['formatter'], string | undefined>

export interface ChartSeriesConfig {
  name: string
  data: number[]
  colorKey: keyof ChartThemeColors
}

export interface ChartConfigOptions {
  colors: ChartThemeColors
  labels: string[]
  series: ReadonlyArray<ChartSeriesConfig>
  legendSelected?: Record<string, boolean>
  tooltipFormatter?: TooltipFormatter
  yAxisFormatter?: (value: number) => string
  enableDataZoom?: boolean
  gridTop?: number
  legendTop?: number
}

const createSeries = (
  config: ChartSeriesConfig,
  colors: ChartThemeColors,
): LineSeriesOption => {
  const color = colors[config.colorKey]
  return {
    name: config.name,
    type: 'line',
    data: config.data,
    smooth: true,
    lineStyle: { color },
    itemStyle: { color },
    emphasis: {
      lineStyle: { color },
      itemStyle: { color },
    },
    symbol: 'circle',
    symbolSize: 8,
    sampling: 'lttb',
    connectNulls: true,
  }
}

export const buildChartOption = (options: ChartConfigOptions): ChartOption => {
  const {
    colors,
    labels,
    series,
    legendSelected,
    tooltipFormatter,
    yAxisFormatter,
    enableDataZoom = false,
    gridTop = 50,
    legendTop = 0,
  } = options

  const baseOption: ChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.background,
      borderColor: colors.axis,
      textStyle: { color: colors.text },
      ...(tooltipFormatter ? { formatter: tooltipFormatter } : {}),
    },
    legend: {
      type: 'scroll',
      top: legendTop,
      textStyle: { color: colors.legend },
      inactiveColor: colors.axis,
      ...(legendSelected ? { selected: legendSelected } : {}),
      lineStyle: { inactiveColor: 'transparent' },
    },
    grid: {
      top: gridTop,
      left: 50,
      right: 30,
      bottom: 60,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: {
        rotate: 45,
        color: colors.axis,
      },
      axisLine: {
        lineStyle: { color: colors.axis },
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        ...(yAxisFormatter ? { formatter: yAxisFormatter } : {}),
        color: colors.axis,
      },
      axisLine: {
        lineStyle: { color: colors.axis },
      },
      splitLine: {
        lineStyle: { color: colors.grid },
      },
    },
    series: series.map(s => createSeries(s, colors)),
  }

  if (enableDataZoom) {
    return {
      ...baseOption,
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
      ],
    }
  }

  return baseOption
}

export const useChartConfig = () => {
  return {
    buildChartOption,
  }
}
