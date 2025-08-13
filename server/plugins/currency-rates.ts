import { updateCurrentRates, updateHistoricalRatesForCurrentMonth, shouldUpdateRatesNow } from '~~/server/utils/rates/scheduler'

const ENABLE_CURRENCY_RATES_UPDATE = 'ENABLE_CURRENCY_RATES_AUTO_UPDATE'
const CHECK_INTERVAL_MS = 5 * 60 * 1000
const MAX_ATTEMPTS_PER_TASK = 5

const formatDateKey = (date: Date): string => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface TaskState {
  attempts: number
  completed: boolean
}

const taskStates = new Map<string, TaskState>()
let currentDateKey = formatDateKey(new Date())
let updateTimer: NodeJS.Timeout | null = null
let isSchedulerActive = false

const executeScheduledTasks = async (): Promise<void> => {
  const now = new Date()
  const todayKey = formatDateKey(now)

  if (todayKey !== currentDateKey) {
    taskStates.clear()
    currentDateKey = todayKey
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

  for (const { key, action } of tasks) {
    const state = taskStates.get(key) ?? { attempts: 0, completed: false }

    if (state.completed) {
      continue
    }

    if (state.attempts >= MAX_ATTEMPTS_PER_TASK) {
      continue
    }

    try {
      await action()
      taskStates.set(key, { attempts: state.attempts + 1, completed: true })
      console.log(`Currency rate update task succeeded: ${key}`)
    }
    catch (error) {
      taskStates.set(key, { attempts: state.attempts + 1, completed: false })
      console.error(`Currency rate update task failed: ${key}`, error)
    }
  }
}

const startCurrencyRatesScheduler = (): void => {
  if (isSchedulerActive) {
    return
  }

  updateTimer = setInterval(() => {
    void executeScheduledTasks()
  }, CHECK_INTERVAL_MS)

  void executeScheduledTasks()
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

export const __testables__ = {
  executeScheduledTasks,
  taskStates,
  resetState: (): void => {
    taskStates.clear()
    currentDateKey = formatDateKey(new Date())
  },
}

export default defineNitroPlugin(async (nitroApp) => {
  if (process.env[ENABLE_CURRENCY_RATES_UPDATE] !== '1') {
    return
  }

  startCurrencyRatesScheduler()
  nitroApp.hooks.hook('close', () => stopCurrencyRatesScheduler())
})
