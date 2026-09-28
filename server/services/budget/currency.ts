import { eq, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { plan, user } from '~~/server/db/schema'
import { loadExchangeRates } from '~~/server/services/budget/rates'
import { chunkArray, D1_MAX_VARIABLES_PER_STATEMENT } from '~~/server/utils/d1-limits'
import { MAX_AMOUNT } from '~~/shared/schemas/common'
import { convertAmount } from '~~/shared/utils/budget/budget'

interface PlanAmount {
  id: string
  plannedBalanceChange: number
}

const PLANS_PER_UPDATE = Math.floor((D1_MAX_VARIABLES_PER_STATEMENT - 1) / 2)

const hasAmount = <T extends { plannedBalanceChange: number | null }>(row: T): row is T & PlanAmount =>
  row.plannedBalanceChange !== null

const toPlanAmount = (amount: number): number => Math.min(MAX_AMOUNT, Math.max(-MAX_AMOUNT, Math.round(amount)))

const convertPlanAmounts = async (userId: string, fromCurrency: string, toCurrency: string, event: H3Event): Promise<PlanAmount[]> => {
  const plans = (await useDatabase(event)
    .select({ id: plan.id, year: plan.year, month: plan.month, plannedBalanceChange: plan.plannedBalanceChange })
    .from(plan)
    .where(eq(plan.userId, userId)))
    .filter(hasAmount)

  if (plans.length === 0) {
    return []
  }

  const getExchangeRates = await loadExchangeRates(plans, event)

  return plans.map(({ id, year, month, plannedBalanceChange }) => ({
    id,
    plannedBalanceChange: toPlanAmount(convertAmount(plannedBalanceChange, fromCurrency, toCurrency, getExchangeRates(year, month).rates)),
  }))
}

const createPlanAmountUpdates = (userId: string, planAmounts: readonly PlanAmount[], event: H3Event) => {
  const db = useDatabase(event)

  return chunkArray(planAmounts, PLANS_PER_UPDATE).map(chunk => db
    .update(plan)
    .set({
      plannedBalanceChange: sql`CASE ${plan.id} ${sql.join(chunk.map(({ id, plannedBalanceChange }) => sql`WHEN ${id} THEN ${plannedBalanceChange}`), sql` `)} ELSE ${plan.plannedBalanceChange} END`,
    })
    .where(eq(plan.userId, userId)))
}

export const changeMainCurrency = async (userId: string, currency: string, event: H3Event): Promise<void> => {
  const db = useDatabase(event)
  const [owner] = await db
    .select({ mainCurrency: user.mainCurrency })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  const planAmounts = owner && owner.mainCurrency !== currency
    ? await convertPlanAmounts(userId, owner.mainCurrency, currency, event)
    : []

  await db.batch([
    db.update(user).set({ mainCurrency: currency }).where(eq(user.id, userId)),
    ...createPlanAmountUpdates(userId, planAmounts, event),
  ])
}
