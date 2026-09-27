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
  const [savedPlan] = await useDatabase(event)
    .insert(plan)
    .values({
      id: crypto.randomUUID(),
      userId,
      year,
      month,
      plannedBalanceChange,
      comment,
    })
    .onConflictDoUpdate({
      target: [plan.userId, plan.year, plan.month],
      set: { plannedBalanceChange, comment },
    })
    .returning({ id: plan.id })

  if (!savedPlan) {
    throw new Error('Plan was not saved')
  }

  return { id: savedPlan.id, year, month, plannedBalanceChange, comment }
}

export const deletePlan = async (
  userId: string,
  year: number,
  month: number,
  event: H3Event,
): Promise<boolean> => {
  const deletedPlans = await useDatabase(event)
    .delete(plan)
    .where(and(
      eq(plan.userId, userId),
      eq(plan.year, year),
      eq(plan.month, month),
    ))
    .returning({ id: plan.id })

  return deletedPlans.length > 0
}
