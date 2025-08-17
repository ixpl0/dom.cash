import { requireAuth } from '~~/server/utils/session'
import { getEntryWithMonth, checkWritePermissionForMonth, deleteEntry } from '~~/server/services/entries'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const entryId = getRouterParam(event, 'id')

  if (!entryId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Entry ID is required',
    })
  }

  const entryRecord = await getEntryWithMonth(entryId)
  if (!entryRecord || !entryRecord.month) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Entry not found',
    })
  }

  const hasPermission = await checkWritePermissionForMonth(entryRecord.month.userId, user.id)
  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to delete entries',
    })
  }

  await deleteEntry(entryId)

  try {
    const { createNotification } = await import('~~/server/services/notifications')
    const kindNames = { balance: 'баланс', income: 'доход', expense: 'расход' }
    await createNotification({
      sourceUserId: user.id,
      budgetOwnerId: entryRecord.month.userId,
      type: 'budget_entry_deleted',
      message: `${user.username} удалил запись "${entryRecord.entry.description}" (${kindNames[entryRecord.entry.kind]}: ${entryRecord.entry.amount} ${entryRecord.entry.currency})`,
    })
  }
  catch (error) {
    console.error('Error creating notification:', error)
  }

  return { success: true }
})
