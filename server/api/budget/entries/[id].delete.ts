import { requireAuth } from '~~/server/utils/session'
import { getEntryWithMonth, checkWritePermissionForMonth, deleteEntry } from '~~/server/services/entries'
import { secureLog } from '~~/server/utils/secure-logger'
import { createNotification } from '~~/server/services/notifications'
import { findUserById } from '~~/server/services/users'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const entryId = getRouterParam(event, 'id')

  if (!entryId) {
    throw createError({
      statusCode: 400,
      message: 'Entry ID is required',
    })
  }

  const entryRecord = await getEntryWithMonth(entryId, event)
  if (!entryRecord || !entryRecord.month) {
    throw createError({
      statusCode: 404,
      message: 'Entry not found',
    })
  }

  const hasPermission = await checkWritePermissionForMonth(entryRecord.month.userId, user.id, event)
  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      message: 'Insufficient permissions to delete entries',
    })
  }

  await deleteEntry(entryId, event)

  try {
    const budgetOwner = await findUserById(entryRecord.month.userId, event)
    const kindNames = { balance: 'баланс', income: 'доход', expense: 'расход' }
    await createNotification({
      sourceUserId: user.id,
      sourceUsername: user.username,
      budgetOwnerId: entryRecord.month.userId,
      budgetOwnerUsername: budgetOwner?.username || 'unknown',
      type: 'budget_entry_deleted',
      message: `${user.username} удалил запись "${entryRecord.entry.description}" (${kindNames[entryRecord.entry.kind]}: ${entryRecord.entry.amount} ${entryRecord.entry.currency})`,
    }, event)
  }
  catch (error) {
    secureLog.error('Error creating notification:', error)
  }

  return { success: true }
})
