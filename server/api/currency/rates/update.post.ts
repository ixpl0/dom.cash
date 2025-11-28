import { requireAuth } from '~~/server/utils/session'
import { saveHistoricalRatesForCurrentMonth } from '~~/server/utils/rates/database'
import { clearRatesCache } from '~~/server/services/months'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  try {
    await saveHistoricalRatesForCurrentMonth(event)
    clearRatesCache()
    return { success: true }
  }
  catch {
    throw createError({
      statusCode: 500,
      message: ERROR_KEYS.FAILED_TO_UPDATE_RATES,
    })
  }
})
