import { requireAuth } from '~~/server/utils/session'
import { getEntryWithMonth, checkWritePermissionForMonth, deleteEntry } from '~~/server/services/entries'
import { secureLog } from '~~/server/utils/secure-logger'

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
    const { createNotification } = await import('~~/server/services/notifications')
    await createNotification({
      sourceUserId: user.id,
      budgetOwnerId: entryRecord.month.userId,
      type: 'budget_entry_deleted',
      params: {
        username: user.username,
        description: entryRecord.entry.description,
        kind: entryRecord.entry.kind,
        amount: entryRecord.entry.amount,
        entryCurrency: entryRecord.entry.currency,
      },
    })
  }
  catch (error) {
    secureLog.error('Error creating notification:', error)
  }

  return { success: true }
})
