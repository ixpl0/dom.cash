import { eq, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { plan, user } from '~~/server/db/schema'
import { loadExchangeRates } from '~~/server/services/budget/rates'
import { chunkArray, D1_MAX_VARIABLES_PER_STATEMENT } from '~~/server/utils/d1-limits'
import { MAX_AMOUNT } from '~~/shared/schemas/common'
import { convertAmount } from '~~/shared/utils/budget/budget'

interface PlanAmount {
  year: number
  month: number
  plannedBalanceChange: number | null
}

interface StoredPlanAmount {
  id: string
  plannedBalanceChange: number
}

const PLANS_PER_UPDATE = Math.floor((D1_MAX_VARIABLES_PER_STATEMENT - 1) / 2)

const hasAmount = <T extends { plannedBalanceChange: number | null }>(row: T): row is T & { plannedBalanceChange: number } =>
  row.plannedBalanceChange !== null

const toPlanAmount = (amount: number): number => Math.min(MAX_AMOUNT, Math.max(-MAX_AMOUNT, Math.round(amount)))

export const convertPlansToCurrency = async <T extends PlanAmount>(
  plans: readonly T[],
  fromCurrency: string,
  toCurrency: string,
  event: H3Event,
): Promise<T[]> => {
  const plansWithAmounts = plans.filter(hasAmount)

  if (fromCurrency === toCurrency || plansWithAmounts.length === 0) {
    return [...plans]
  }

  const getExchangeRates = await loadExchangeRates(plansWithAmounts, event)

  return plans.map(planRow => hasAmount(planRow)
    ? {
        ...planRow,
        plannedBalanceChange: toPlanAmount(convertAmount(
          planRow.plannedBalanceChange,
          fromCurrency,
          toCurrency,
          getExchangeRates(planRow.year, planRow.month).rates,
        )),
      }
    : planRow)
}

const createPlanAmountUpdates = (userId: string, planAmounts: readonly StoredPlanAmount[], event: H3Event) => {
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

  const plans = owner && owner.mainCurrency !== currency
    ? await db
        .select({ id: plan.id, year: plan.year, month: plan.month, plannedBalanceChange: plan.plannedBalanceChange })
        .from(plan)
        .where(eq(plan.userId, userId))
    : []
  const convertedPlans = await convertPlansToCurrency(plans, owner?.mainCurrency ?? currency, currency, event)

  await db.batch([
    db.update(user).set({ mainCurrency: currency }).where(eq(user.id, userId)),
    ...createPlanAmountUpdates(userId, convertedPlans.filter(hasAmount), event),
  ])
}
