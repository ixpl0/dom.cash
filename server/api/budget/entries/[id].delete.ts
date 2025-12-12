import { requireAuth } from '~~/server/utils/session'
import { getEntryWithMonth, deleteEntry } from '~~/server/services/budget/entries'
import { checkBudgetWritePermission } from '~~/server/utils/auth'
import { secureLog } from '~~/server/utils/secure-logger'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const entryId = getRouterParam(event, 'id')

  if (!entryId) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.ENTRY_ID_REQUIRED,
    })
  }

  const entryRecord = await getEntryWithMonth(entryId, event)
  if (!entryRecord || !entryRecord.month) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.ENTRY_NOT_FOUND,
    })
  }

  const hasPermission = await checkBudgetWritePermission(entryRecord.month.userId, user.id, event)
  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      message: ERROR_KEYS.INSUFFICIENT_PERMISSIONS_DELETE,
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
