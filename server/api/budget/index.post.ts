import { defineEventHandler, createError } from 'h3'
import { db } from '~~/server/db'
import { month } from '~~/server/db/schema'
import { parseBody } from '~~/server/utils/validation'
import { requireAuth } from '~~/server/utils/session'
import { createMonthSchema } from '~~/server/schemas/budget'

export default defineEventHandler(async event => {
  const user = await requireAuth(event)
  const { year, month: m } = await parseBody(event, createMonthSchema)
  const id = crypto.randomUUID()
  await db.insert(month).values({ id, userId: user.id, year, month: m }).catch(() => {
    throw createError({ statusCode: 400, statusMessage: 'Month exists' })
  })
  return {
    id,
    year,
    month: m,
    userMonthId: id,
    balanceSources: [],
    incomeEntries: [],
    expenseEntries: [],
    balanceChange: 0,
    pocketExpenses: 0,
    income: 0,
  }
})

