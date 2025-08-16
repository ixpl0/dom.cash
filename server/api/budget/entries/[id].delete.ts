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
  return { success: true }
})
