export interface ChartThemeColors {
  text: string
  legend: string
  axis: string
  grid: string
  background: string
  primary: string
  success: string
  error: string
  warning: string
  secondary: string
  accent: string
  info: string
}

const DEFAULT_COLORS: ChartThemeColors = {
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

export const getChartThemeColors = (): ChartThemeColors => {
  if (!import.meta.client) {
    return DEFAULT_COLORS
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
    text: baseContent || DEFAULT_COLORS.text,
    legend: baseContent || DEFAULT_COLORS.legend,
    axis: baseContent
      ? `color-mix(in srgb, ${baseContent} 70%, transparent)`
      : DEFAULT_COLORS.axis,
    grid: baseContent
      ? `color-mix(in srgb, ${baseContent} 10%, transparent)`
      : DEFAULT_COLORS.grid,
    background: base200 || DEFAULT_COLORS.background,
    primary: primary || DEFAULT_COLORS.primary,
    success: success || DEFAULT_COLORS.success,
    error: error || DEFAULT_COLORS.error,
    warning: warning || DEFAULT_COLORS.warning,
    secondary: secondary || DEFAULT_COLORS.secondary,
    accent: accent || DEFAULT_COLORS.accent,
    info: info || DEFAULT_COLORS.info,
  }
}

export const useChartTheme = () => {
  const { currentTheme } = useTheme()
  const colors = ref<ChartThemeColors>(getChartThemeColors())

  const refreshColors = () => {
    colors.value = getChartThemeColors()
  }

  watch(currentTheme, () => {
    if (import.meta.client) {
      refreshColors()
    }
  })

  return {
    colors,
    refreshColors,
  }
}
