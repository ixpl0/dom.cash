import { getQuery, createError } from 'h3'
import { z } from 'zod'
import { requireAuth } from '~~/server/utils/session'
import { getUserMonthsByYears, getAvailableYears, getInitialYearsToLoad } from '~~/server/services/months'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)

  const querySchema = z.object({
    years: z.string().optional(),
  })

  const parsed = querySchema.safeParse(query)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid query parameters',
    })
  }

  const yearsParam = parsed.data.years

  let months
  if (yearsParam) {
    const years = yearsParam.split(',').map(year => parseInt(year, 10)).filter(year => !isNaN(year))
    months = await getUserMonthsByYears(user.id, years, event)
  }
  else {
    const availableYears = await getAvailableYears(user.id, event)
    const initialYears = getInitialYearsToLoad(availableYears)
    months = await getUserMonthsByYears(user.id, initialYears, event)
  }

  return {
    user: {
      username: user.username,
      mainCurrency: user.mainCurrency,
    },
    access: 'owner' as const,
    months,
  }
})
