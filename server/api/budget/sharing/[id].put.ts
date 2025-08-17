import { requireAuth } from '~~/server/utils/session'
import { updateShare, checkShareOwnership, getShareById } from '~~/server/services/sharing'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const shareId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!shareId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Share ID is required',
    })
  }

  const share = await getShareById(shareId)
  if (!share) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Share not found',
    })
  }

  const isOwner = await checkShareOwnership(shareId, user.id)
  if (!isOwner) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to update share',
    })
  }

  const updatedShare = await updateShare(shareId, { access: body.access })

  const { createNotification } = await import('~~/server/services/notifications')
  const accessNames: Record<string, string> = { read: 'только чтение', write: 'чтение и редактирование' }
  await createNotification({
    sourceUserId: user.id,
    budgetOwnerId: user.id,
    type: 'budget_share_updated',
    message: `${user.username} изменил права доступа к своему бюджету на "${accessNames[body.access] || body.access}"`,
  })

  return updatedShare
})
