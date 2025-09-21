import { useDatabase } from '~~/server/db'
import { user, month, entry, budgetShare } from '~~/server/db/schema'
import { like, inArray } from 'drizzle-orm'

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

  const db = await useDatabase(event)

  try {
    const testUsers = await db
      .select({ id: user.id })
      .from(user)
      .where(like(user.username, 'test_%@example.com'))

    if (testUsers.length === 0) {
      return { message: 'No test users found', deleted: 0 }
    }

    const userIds = testUsers.map((u: { id: string }) => u.id)

    const chunkSize = 100
    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize)
      await db.delete(budgetShare).where(inArray(budgetShare.sharedWithId, chunk))
      await db.delete(budgetShare).where(inArray(budgetShare.ownerId, chunk))
    }

    const userMonths: { id: string }[] = []
    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize)
      const monthChunk = await db
        .select({ id: month.id })
        .from(month)
        .where(inArray(month.userId, chunk))
      userMonths.push(...monthChunk)
    }

    if (userMonths.length > 0) {
      const monthIds = userMonths.map((m: { id: string }) => m.id)
      for (let i = 0; i < monthIds.length; i += chunkSize) {
        const chunk = monthIds.slice(i, i + chunkSize)
        await db.delete(entry).where(inArray(entry.monthId, chunk))
      }
    }

    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize)
      await db.delete(month).where(inArray(month.userId, chunk))
    }

    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize)
      await db.delete(user).where(inArray(user.id, chunk))
    }

    return {
      message: 'Test data cleaned up successfully',
      deleted: testUsers.length,
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    throw createError({
      statusCode: 500,
      statusMessage: `Failed to cleanup test data: ${errorMessage}`,
    })
  }
})
