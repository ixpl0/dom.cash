import { getQuery, getRouterParam, createError } from 'h3'
import { z } from 'zod'
import { eq, and, desc, sql, inArray } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { budgetShare, user, month, entry } from '~~/server/db/schema'
import type { BudgetShareAccess } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { getExchangeRatesForMonth, getAvailableYears, getInitialYearsToLoad } from '~~/server/services/months'
import { updateUserActivity } from '~~/server/services/users'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

export default defineEventHandler(async (event) => {
  const db = useDatabase(event)
  const currentUser = await getUserFromRequest(event)
  if (!currentUser) {
    throw createError({
      statusCode: 401,
      message: ERROR_KEYS.UNAUTHORIZED,
    })
  }

  const username = getRouterParam(event, 'username')
  if (!username) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.USERNAME_REQUIRED,
    })
  }

  const targetUser = await db
    .select()
    .from(user)
    .where(eq(user.username, username))
    .limit(1)

  if (targetUser.length === 0) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.USER_NOT_FOUND,
    })
  }

  const targetUserData = targetUser[0]
  if (!targetUserData) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.USER_NOT_FOUND,
    })
  }

  let access: BudgetShareAccess | 'owner' = 'owner'
  const isOwner = targetUserData.id === currentUser.id

  if (!isOwner) {
    const shareRecord = await db
      .select({ access: budgetShare.access })
      .from(budgetShare)
      .where(and(
        eq(budgetShare.ownerId, targetUserData.id),
        eq(budgetShare.sharedWithId, currentUser.id),
      ))
      .limit(1)

    if (shareRecord.length === 0) {
      throw createError({
        statusCode: 403,
        message: ERROR_KEYS.ACCESS_DENIED,
      })
    }

    const shareData = shareRecord[0]
    if (!shareData) {
      throw createError({
        statusCode: 403,
        message: ERROR_KEYS.ACCESS_DENIED,
      })
    }
    access = shareData.access
  }

  const query = getQuery(event)
  const querySchema = z.object({
    years: z.string().optional(),
  })
  const parsed = querySchema.safeParse(query)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.INVALID_QUERY_PARAMETERS,
    })
  }
  const yearsParam = parsed.data.years

  let monthsWhereClause
  if (yearsParam) {
    const years = yearsParam.split(',').map(year => parseInt(year, 10)).filter(year => !isNaN(year))
    monthsWhereClause = and(
      eq(month.userId, targetUserData.id),
      years.length > 0 ? sql`${month.year} IN (${sql.join(years.map(year => sql`${year}`), sql`, `)})` : sql`1 = 0`,
    )
  }
  else {
    const availableYears = await getAvailableYears(targetUserData.id, event)
    const initialYears = getInitialYearsToLoad(availableYears)
    monthsWhereClause = and(
      eq(month.userId, targetUserData.id),
      initialYears.length > 0 ? sql`${month.year} IN (${sql.join(initialYears.map(year => sql`${year}`), sql`, `)})` : sql`1 = 0`,
    )
  }

  const months = await db
    .select({
      id: month.id,
      year: month.year,
      month: month.month,
    })
    .from(month)
    .where(monthsWhereClause)
    .orderBy(desc(month.year), desc(month.month))

  const monthIds = months.map(m => m.id)
  let entries: Array<{
    id: string
    monthId: string
    kind: 'balance' | 'income' | 'expense'
    description: string
    amount: number
    currency: string
    date: string | null
    isOptional: boolean | null
  }> = []

  if (monthIds.length > 0) {
    entries = await db
      .select()
      .from(entry)
      .where(inArray(entry.monthId, monthIds))
  }

  const monthsWithEntries = await Promise.all(months.map(async (monthData) => {
    const monthEntries = entries.filter(e => e.monthId === monthData.id)

    const balanceSources = monthEntries.filter(e => e.kind === 'balance').map(e => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
    }))

    const incomeEntries = monthEntries.filter(e => e.kind === 'income').map(e => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      date: e.date,
    }))

    const expenseEntries = monthEntries.filter(e => e.kind === 'expense').map(e => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      date: e.date,
      isOptional: e.isOptional || false,
    }))

    const totalIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0)
    const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0)
    const balanceChange = totalIncome - totalExpenses

    const exchangeRatesData = await getExchangeRatesForMonth(monthData.year, monthData.month, event)

    return {
      id: monthData.id,
      year: monthData.year,
      month: monthData.month,
      userMonthId: monthData.id,
      balanceSources,
      incomeEntries,
      expenseEntries,
      balanceChange,
      pocketExpenses: 0,
      income: totalIncome,
      exchangeRates: exchangeRatesData.rates,
      exchangeRatesSource: exchangeRatesData.source,
    }
  }))

  await updateUserActivity(currentUser.id, event)

  return {
    user: {
      username: targetUserData.username,
      mainCurrency: targetUserData.mainCurrency,
    },
    access,
    months: monthsWithEntries,
  }
})
