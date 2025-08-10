import { desc, eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { entry, month } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const monthsData = await db
    .select()
    .from(month)
    .where(eq(month.userId, user.id))
    .orderBy(desc(month.year), desc(month.month))

  return await Promise.all(
    monthsData.map(async (monthData) => {
      const entries = await db
        .select()
        .from(entry)
        .where(eq(entry.monthId, monthData.id))

      const balanceSources = entries
        .filter(e => e.kind === 'balance')
        .map(e => ({
          id: e.id,
          description: e.description,
          currency: e.currency,
          amount: e.amount,
        }))

      const incomeEntries = entries
        .filter(e => e.kind === 'income')
        .map(e => ({
          id: e.id,
          description: e.description,
          amount: e.amount,
          currency: e.currency,
          date: e.date,
        }))

      const expenseEntries = entries
        .filter(e => e.kind === 'expense')
        .map(e => ({
          id: e.id,
          description: e.description,
          amount: e.amount,
          currency: e.currency,
          date: e.date,
        }))

      const totalIncome = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0)
      const totalExpenses = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0)
      const balanceChange = totalIncome - totalExpenses

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
      }
    }),
  )
})
