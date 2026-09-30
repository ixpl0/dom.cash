import { getCurrentInstance, onMounted, readonly, ref } from 'vue'
import { toLocalIsoDate } from '~~/shared/utils/shared/dates'

const TODAY_CHECK_INTERVAL_MS = 60 * 1000

const today = ref<string | null>(null)
let checkTimerId: ReturnType<typeof setInterval> | null = null

const updateToday = (): void => {
  const date = toLocalIsoDate(new Date())

  if (today.value !== date) {
    today.value = date
  }
}

const startClock = (): void => {
  updateToday()

  if (checkTimerId === null) {
    checkTimerId = setInterval(updateToday, TODAY_CHECK_INTERVAL_MS)
  }
}

export const useToday = () => {
  if (getCurrentInstance()) {
    onMounted(startClock)
  }

  return readonly(today)
}
