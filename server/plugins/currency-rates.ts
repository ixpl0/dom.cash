import { updateCurrentRates, updateHistoricalRatesForCurrentMonth, shouldUpdateRatesNow } from '~~/server/utils/rates/scheduler'

const ENABLE_CURRENCY_RATES_UPDATE = 'ENABLE_CURRENCY_RATES_AUTO_UPDATE'
const SCHEDULED_TIME_UTC = '00:13'
const TIME_WINDOW_SECONDS = 30
const CHECK_INTERVAL_MS = 30_000

const isTimeForScheduledUpdate = (now: Date, targetTime: string): boolean => {
  const [hours, minutes] = targetTime.split(':').map(Number)
  const targetTimestamp = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    hours,
    minutes,
    0,
    0,
  )

  const timeDifferenceSeconds = Math.abs((now.getTime() - targetTimestamp) / 1000)
  return timeDifferenceSeconds <= TIME_WINDOW_SECONDS
}

const formatDateKey = (date: Date): string => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const completedTasks = new Set<string>()
let currentDateKey = formatDateKey(new Date())
let updateTimer: NodeJS.Timeout | null = null
let isSchedulerActive = false

const executeScheduledTasks = async (): Promise<void> => {
  const now = new Date()
  const todayKey = formatDateKey(now)

  if (todayKey !== currentDateKey) {
    completedTasks.clear()
    currentDateKey = todayKey
  }

  if (!isTimeForScheduledUpdate(now, SCHEDULED_TIME_UTC)) {
    return
  }

  const { updateCurrent, updateHistorical } = shouldUpdateRatesNow(now)

  const tasks: Array<{ key: string, action: () => Promise<void> }> = []

  if (updateCurrent) {
    tasks.push({
      key: `${todayKey}-current`,
      action: updateCurrentRates,
    })
  }

  if (updateHistorical) {
    tasks.push({
      key: `${todayKey}-historical`,
      action: updateHistoricalRatesForCurrentMonth,
    })
  }

  const pendingTasks = tasks.filter(({ key }) => !completedTasks.has(key))

  if (pendingTasks.length === 0) {
    return
  }

  await Promise.all(
    pendingTasks.map(async ({ key, action }) => {
      try {
        await action()
        completedTasks.add(key)
      }
      catch (error) {
        console.error(`Error executing currency rate update task: ${key}`, error)
      }
    }),
  )
}

const startCurrencyRatesScheduler = (): void => {
  if (isSchedulerActive) {
    return
  }

  updateTimer = setInterval(() => {
    void executeScheduledTasks()
  }, CHECK_INTERVAL_MS)

  isSchedulerActive = true
}

const stopCurrencyRatesScheduler = (): void => {
  if (!updateTimer) {
    return
  }

  clearInterval(updateTimer)
  updateTimer = null
  isSchedulerActive = false
}

export default defineNitroPlugin(async (nitroApp) => {
  if (process.env[ENABLE_CURRENCY_RATES_UPDATE] !== '1') {
    return
  }

  startCurrencyRatesScheduler()
  nitroApp.hooks.hook('close', () => stopCurrencyRatesScheduler())
})
