import { eq, or, and, desc } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { budgetShare, user, month, entry } from '~~/server/db/schema'
import type { BudgetShareAccess } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { getExchangeRatesForMonth } from '~~/server/services/months'

export default defineEventHandler(async (event) => {
  const db = useDatabase(event)
  const currentUser = await getUserFromRequest(event)
  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const username = getRouterParam(event, 'username')
  if (!username) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username is required',
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
      statusMessage: 'User not found',
    })
  }

  const targetUserData = targetUser[0]
  if (!targetUserData) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found',
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
        statusMessage: 'Access denied',
      })
    }

    const shareData = shareRecord[0]
    if (!shareData) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied',
      })
    }
    access = shareData.access
  }

  const months = await db
    .select({
      id: month.id,
      year: month.year,
      month: month.month,
    })
    .from(month)
    .where(eq(month.userId, targetUserData.id))
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
  }> = []

  if (monthIds.length > 0) {
    entries = await db
      .select()
      .from(entry)
      .where(or(...monthIds.map(id => eq(entry.monthId, id))))
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
      exchangeRates: exchangeRatesData?.rates,
      exchangeRatesSource: exchangeRatesData?.source,
    }
  }))

  return {
    user: {
      username: targetUserData.username,
      mainCurrency: targetUserData.mainCurrency,
    },
    access,
    months: monthsWithEntries,
  }
})
