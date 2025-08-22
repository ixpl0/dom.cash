import { requireAuth } from '~~/server/utils/session'
import { updateShare, checkShareOwnership, getShareById } from '~~/server/services/sharing'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const shareId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!shareId) {
    throw createError({
      statusCode: 400,
      message: 'Share ID is required',
    })
  }

  const share = await getShareById(shareId, event)
  if (!share) {
    throw createError({
      statusCode: 404,
      message: 'Share not found',
    })
  }

  const isOwner = await checkShareOwnership(shareId, user.id, event)
  if (!isOwner) {
    throw createError({
      statusCode: 403,
      message: 'Insufficient permissions to update share',
    })
  }

  const updatedShare = await updateShare(shareId, { access: body.access }, event)

  try {
    const { createNotification } = await import('~~/server/services/notifications')
    const accessNames: Record<string, string> = { read: 'только чтение', write: 'чтение и редактирование' }
    await createNotification({
      sourceUserId: user.id,
      budgetOwnerId: user.id,
      type: 'budget_share_updated',
      message: `${user.username} изменил ваши права доступа к бюджету на "${accessNames[body.access] || body.access}"`,
      targetUserId: share.sharedWith.id,
    })
  }
  catch (error) {
    console.error('Error creating notification:', error)
  }

  return updatedShare
})
