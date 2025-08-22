import { requireAuth } from '~~/server/utils/session'
import { saveHistoricalRatesForCurrentMonth } from '~~/server/utils/rates/database'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  try {
    await saveHistoricalRatesForCurrentMonth(event)
    return { success: true, message: 'Currency rates updated successfully' }
  }
  catch (error) {
    if (error instanceof Error) {
      throw createError({
        statusCode: 500,
        message: `Failed to update currency rates: ${error.message}`,
      })
    }

    throw createError({
      statusCode: 500,
      message: 'Unknown error occurred while updating currency rates',
    })
  }
})
