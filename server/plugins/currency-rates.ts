import * as cron from 'node-cron'
import { hasRatesForCurrentMonth, saveHistoricalRatesForCurrentMonth } from '~~/server/utils/rates/database'

const ENABLE_CURRENCY_RATES_UPDATE = 'ENABLE_CURRENCY_RATES_AUTO_UPDATE'

const updateCurrencyRates = async (): Promise<void> => {
  try {
    const hasRates = await hasRatesForCurrentMonth()

    if (hasRates) {
      console.log('Currency rates for current month already exist, skipping update')
      return
    }

    console.log('Updating currency rates for current month...')
    await saveHistoricalRatesForCurrentMonth()
    console.log('Currency rates updated successfully')
  }
  catch (error) {
    console.error('Failed to update currency rates:', error)
  }
}

let scheduledTask: cron.ScheduledTask | null = null

const startCurrencyRatesScheduler = (): void => {
  if (scheduledTask !== null) {
    return
  }

  scheduledTask = cron.schedule('5 0 * * *', updateCurrencyRates, {
    timezone: 'UTC',
  })

  scheduledTask.start()
  console.log('Currency rates scheduler started (runs daily at 00:05 UTC)')
}

const stopCurrencyRatesScheduler = (): void => {
  if (scheduledTask !== null) {
    scheduledTask.stop()
    scheduledTask = null
    console.log('Currency rates scheduler stopped')
  }
}

export const __testables__ = {
  updateCurrencyRates,
}

export default defineNitroPlugin(async (nitroApp) => {
  if (process.env[ENABLE_CURRENCY_RATES_UPDATE] !== '1') {
    return
  }

  startCurrencyRatesScheduler()
  nitroApp.hooks.hook('close', () => stopCurrencyRatesScheduler())
})
