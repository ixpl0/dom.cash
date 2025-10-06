import { useDatabase } from '~~/server/db'
import { month, entry, budgetShare, user as userTable } from '~~/server/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { getUserFromRequest } from '~~/server/utils/auth'
import { secureLog } from '~~/server/utils/secure-logger'

export default defineEventHandler(async (event) => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isTest = process.env.NODE_ENV === 'test'
  const isE2E = process.env.E2E_TESTING === 'true'

  if (!isDevelopment && !isTest && !isE2E) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Cleanup endpoint is only available in development/test/e2e mode',
    })
  }

  const user = await getUserFromRequest(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const db = await useDatabase(event)

  try {
    await db.delete(budgetShare).where(eq(budgetShare.sharedWithId, user.id))
    await db.delete(budgetShare).where(eq(budgetShare.ownerId, user.id))

    const userMonths = await db
      .select({ id: month.id })
      .from(month)
      .where(eq(month.userId, user.id))

    if (userMonths.length > 0) {
      const monthIds = userMonths.map((m: { id: string }) => m.id)
      await db.delete(entry).where(inArray(entry.monthId, monthIds))
    }

    await db.delete(month).where(eq(month.userId, user.id))

    await db.update(userTable).set({ mainCurrency: 'USD' }).where(eq(userTable.id, user.id))

    return {
      message: 'User data cleaned up successfully',
      deletedMonths: userMonths.length,
    }
  }
  catch (error) {
    secureLog.error('User data cleanup failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to cleanup user data',
    })
  }
})
