import { z } from 'zod'
import type { H3Event } from 'h3'
import { saveCurrencyRates } from '~~/server/utils/rates/database'

const updateRatesSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rates: z.record(z.string(), z.number()),
})

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody(event)
  const { date, rates } = updateRatesSchema.parse(body)

  await saveCurrencyRates(date, rates, event)

  return { success: true }
})
