import { and, asc, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { plan } from '~~/server/db/schema'
import type { PlanData } from '~~/shared/types/budget'

export const getUserPlans = async (userId: string, event: H3Event): Promise<PlanData[]> => {
  const db = useDatabase(event)
  const rows = await db
    .select({
      id: plan.id,
      year: plan.year,
      month: plan.month,
      plannedBalanceChange: plan.plannedBalanceChange,
      comment: plan.comment,
    })
    .from(plan)
    .where(eq(plan.userId, userId))
    .orderBy(asc(plan.year), asc(plan.month))

  return rows
}

export const upsertPlan = async (
  userId: string,
  year: number,
  month: number,
  plannedBalanceChange: number | null,
  comment: string | null,
  event: H3Event,
): Promise<PlanData> => {
  const db = useDatabase(event)

  const existing = await db
    .select({ id: plan.id })
    .from(plan)
    .where(and(
      eq(plan.userId, userId),
      eq(plan.year, year),
      eq(plan.month, month),
    ))
    .limit(1)

  const existingPlan = existing[0]

  if (existingPlan) {
    await db
      .update(plan)
      .set({ plannedBalanceChange, comment })
      .where(eq(plan.id, existingPlan.id))

    return {
      id: existingPlan.id,
      year,
      month,
      plannedBalanceChange,
      comment,
    }
  }

  const id = crypto.randomUUID()
  await db.insert(plan).values({
    id,
    userId,
    year,
    month,
    plannedBalanceChange,
    comment,
  })

  return { id, year, month, plannedBalanceChange, comment }
}

export const deletePlan = async (
  userId: string,
  year: number,
  month: number,
  event: H3Event,
): Promise<boolean> => {
  const db = useDatabase(event)

  const existing = await db
    .select({ id: plan.id })
    .from(plan)
    .where(and(
      eq(plan.userId, userId),
      eq(plan.year, year),
      eq(plan.month, month),
    ))
    .limit(1)

  if (existing.length === 0) {
    return false
  }

  await db
    .delete(plan)
    .where(and(
      eq(plan.userId, userId),
      eq(plan.year, year),
      eq(plan.month, month),
    ))

  return true
}
