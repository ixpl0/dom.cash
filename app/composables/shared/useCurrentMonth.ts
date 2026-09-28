import { onMounted, readonly, ref } from 'vue'
import { getCurrentMonth, isCurrentMonth, type MonthPosition } from '~~/shared/utils/budget/month-helpers'

const CURRENT_MONTH_CHECK_INTERVAL_MS = 60 * 1000

const currentMonth = ref<MonthPosition | null>(null)
let checkTimerId: ReturnType<typeof setInterval> | null = null

const updateCurrentMonth = (): void => {
  const month = getCurrentMonth()

  if (!currentMonth.value || !isCurrentMonth(currentMonth.value, month)) {
    currentMonth.value = month
  }
}

export const useCurrentMonth = () => {
  onMounted(() => {
    updateCurrentMonth()

    if (checkTimerId === null) {
      checkTimerId = setInterval(updateCurrentMonth, CURRENT_MONTH_CHECK_INTERVAL_MS)
    }
  })

  return readonly(currentMonth)
}
