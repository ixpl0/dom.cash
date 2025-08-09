import { defineEventHandler } from 'h3'
import { eq, inArray } from 'drizzle-orm'
import { db } from '~~/server/db'
import { month, entry, currency } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/session'

export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const months = await db.select().from(month).where(eq(month.userId, user.id))
  const ids = months.map(m => m.id)
  const entries = ids.length === 0 ? [] : await db.select().from(entry).where(inArray(entry.monthId, ids))
  const grouped = entries.reduce((acc, e) => {
    const list = acc[e.monthId] || []
    acc[e.monthId] = list.concat(e)
    return acc
  }, {} as Record<string, typeof entries>)
  const monthsData = months.map(m => {
    const list = grouped[m.id] || []
    const balanceSources = list.filter(e => e.kind === 'balance').map(e => ({
      id: e.id,
      name: e.description,
      amount: e.amount,
      currency: e.currency,
    }))
    const incomeEntries = list.filter(e => e.kind === 'income').map(e => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      date: e.date || '',
    }))
    const expenseEntries = list.filter(e => e.kind === 'expense').map(e => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      date: e.date || '',
    }))
    return {
      id: m.id,
      year: m.year,
      month: m.month,
      userMonthId: m.id,
      balanceSources,
      incomeEntries,
      expenseEntries,
      balanceChange: 0,
      pocketExpenses: 0,
      income: 0,
    }
  })
  const rateRows = await db.select().from(currency)
  const rates = rateRows.reduce((acc, r) => ({ ...acc, [r.date]: r.rates as Record<string, number> }), {} as Record<string, Record<string, number>>)
  return { months: monthsData, rates }
})

