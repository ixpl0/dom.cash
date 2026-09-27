import { inArray, or, sql } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { budgetShare, emailVerificationCode, entry, month, plan, session, todo, todoShare, user } from '~~/server/db/schema'
import { secureLog } from '~~/server/utils/secure-logger'

const TEST_EMAIL_PATTERN = 'test_*@example.com'

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found',
    })
  }

  const db = useDatabase(event)
  const isTestUser = sql`${user.username} GLOB ${TEST_EMAIL_PATTERN}`
  const testUserIds = db.select({ id: user.id }).from(user).where(isTestUser)
  const testMonthIds = db.select({ id: month.id }).from(month).where(inArray(month.userId, testUserIds))
  const testTodoIds = db.select({ id: todo.id }).from(todo).where(inArray(todo.userId, testUserIds))

  try {
    await db.batch([
      db.delete(entry).where(inArray(entry.monthId, testMonthIds)),
      db.delete(month).where(inArray(month.userId, testUserIds)),
      db.delete(plan).where(inArray(plan.userId, testUserIds)),
      db.delete(todoShare).where(or(inArray(todoShare.todoId, testTodoIds), inArray(todoShare.sharedWithId, testUserIds))),
      db.delete(todo).where(inArray(todo.userId, testUserIds)),
      db.delete(budgetShare).where(or(inArray(budgetShare.ownerId, testUserIds), inArray(budgetShare.sharedWithId, testUserIds))),
      db.delete(session).where(inArray(session.userId, testUserIds)),
      db.delete(emailVerificationCode).where(sql`${emailVerificationCode.email} GLOB ${TEST_EMAIL_PATTERN}`),
      db.delete(user).where(isTestUser),
    ])

    return { message: 'Test data cleaned up successfully' }
  }
  catch (error) {
    secureLog.error('Test data cleanup failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to cleanup test data',
    })
  }
})
