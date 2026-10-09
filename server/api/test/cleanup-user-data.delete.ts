import { eq, inArray, or } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { budgetShare, docFolder, docFolderShare, entry, month, oauthAuthorizationCode, oauthGrant, plan, pushSubscription, todo, todoDigestSettings, todoShare, user as userTable } from '~~/server/db/schema'
import { deleteFolderFiles, listOwnedFolderIds } from '~~/server/services/docs/folders'
import { requireAuth } from '~~/server/utils/session'
import { secureLog } from '~~/server/utils/secure-logger'
import { isTestMode } from '~~/server/utils/test-mode'

export default defineEventHandler(async (event) => {
  if (!isTestMode()) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found',
    })
  }

  const user = await requireAuth(event)

  const db = useDatabase(event)
  const userMonthIds = db.select({ id: month.id }).from(month).where(eq(month.userId, user.id))
  const userTodoIds = db.select({ id: todo.id }).from(todo).where(eq(todo.userId, user.id))
  const userFolderIds = db.select({ id: docFolder.id }).from(docFolder).where(eq(docFolder.userId, user.id))

  try {
    const folderIds = await listOwnedFolderIds(user.id, event)

    await db.batch([
      db.delete(budgetShare).where(or(eq(budgetShare.sharedWithId, user.id), eq(budgetShare.ownerId, user.id))),
      db.delete(todoShare).where(or(eq(todoShare.sharedWithId, user.id), inArray(todoShare.todoId, userTodoIds))),
      db.delete(todo).where(eq(todo.userId, user.id)),
      db.delete(docFolderShare).where(or(eq(docFolderShare.sharedWithId, user.id), inArray(docFolderShare.folderId, userFolderIds))),
      db.delete(docFolder).where(eq(docFolder.userId, user.id)),
      db.delete(entry).where(inArray(entry.monthId, userMonthIds)),
      db.delete(month).where(eq(month.userId, user.id)),
      db.delete(plan).where(eq(plan.userId, user.id)),
      db.delete(oauthGrant).where(eq(oauthGrant.userId, user.id)),
      db.delete(oauthAuthorizationCode).where(eq(oauthAuthorizationCode.userId, user.id)),
      db.delete(pushSubscription).where(eq(pushSubscription.userId, user.id)),
      db.delete(todoDigestSettings).where(eq(todoDigestSettings.userId, user.id)),
      db.update(userTable).set({ mainCurrency: 'USD' }).where(eq(userTable.id, user.id)),
    ])
    await deleteFolderFiles(folderIds, event)

    return { message: 'User data cleaned up successfully' }
  }
  catch (error) {
    secureLog.error('User data cleanup failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to cleanup user data',
    })
  }
})
