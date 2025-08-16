import { requireAuth } from '~~/server/utils/session'
import { deleteShare, checkShareOwnership, getShareById } from '~~/server/services/sharing'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const shareId = getRouterParam(event, 'id')

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
      statusMessage: 'Insufficient permissions to delete share',
    })
  }

  await deleteShare(shareId)
  return { success: true }
})
