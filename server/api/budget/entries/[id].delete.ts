import { createError, getRouterParam } from 'h3'
import { requireAuth } from '~~/server/utils/session'
import { getEntryWithMonth, deleteEntry } from '~~/server/services/budget/entries'
import { requireBudgetWriteAccess } from '~~/server/services/budget/access'
import { sendNotification } from '~~/server/services/notifications'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'

export default defineEventHandler(async (event) => {
  const currentUser = await requireAuth(event)
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

  await requireBudgetWriteAccess(entryRecord.month.userId, currentUser, event, ERROR_KEYS.INSUFFICIENT_PERMISSIONS_DELETE)

  await deleteEntry(entryId, event)

  await sendNotification(event, {
    sourceUserId: currentUser.id,
    budgetOwnerId: entryRecord.month.userId,
    type: 'budget_entry_deleted',
    params: {
      username: currentUser.username,
      description: entryRecord.entry.description,
      kind: entryRecord.entry.kind,
      amount: entryRecord.entry.amount,
      entryCurrency: entryRecord.entry.currency,
    },
  })

  return { success: true }
})
