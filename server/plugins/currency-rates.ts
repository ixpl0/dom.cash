import { CronJob } from 'cron'
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

let cronJob: CronJob | null = null

const startCurrencyRatesScheduler = (): void => {
  if (cronJob !== null) {
    return
  }

  cronJob = new CronJob(
    '0 5 0 * * *',
    updateCurrencyRates,
    null,
    false,
    'UTC',
  )

  cronJob.start()
  console.log('Currency rates scheduler started (runs daily at 00:05 UTC)')
}

const stopCurrencyRatesScheduler = (): void => {
  if (cronJob !== null) {
    cronJob.stop()
    cronJob = null
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
