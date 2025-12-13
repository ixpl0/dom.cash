import { eq, and } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { memo, memoShare } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import { secureLog } from '~~/server/utils/secure-logger'

const canEditMemo = async (
  db: ReturnType<typeof useDatabase>,
  memoId: string,
  userId: string,
): Promise<boolean> => {
  const memoRecord = await db
    .select({ userId: memo.userId })
    .from(memo)
    .where(eq(memo.id, memoId))
    .limit(1)

  if (memoRecord.length > 0 && memoRecord[0]?.userId === userId) {
    return true
  }

  const shareRecord = await db
    .select({ id: memoShare.id })
    .from(memoShare)
    .where(and(
      eq(memoShare.memoId, memoId),
      eq(memoShare.sharedWithId, userId),
    ))
    .limit(1)

  return shareRecord.length > 0
}

export default defineEventHandler(async (event) => {
  const db = useDatabase(event)
  const currentUser = await getUserFromRequest(event)
  if (!currentUser) {
    throw createError({
      statusCode: 401,
      message: ERROR_KEYS.UNAUTHORIZED,
    })
  }

  const memoId = getRouterParam(event, 'id')
  if (!memoId) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.MEMO_ID_REQUIRED,
    })
  }

  const memoRecord = await db
    .select()
    .from(memo)
    .where(eq(memo.id, memoId))
    .limit(1)

  if (memoRecord.length === 0) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.MEMO_NOT_FOUND,
    })
  }

  const existingMemo = memoRecord[0]
  if (!existingMemo) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.MEMO_NOT_FOUND,
    })
  }

  const canEdit = await canEditMemo(db, memoId, currentUser.id)
  if (!canEdit) {
    throw createError({
      statusCode: 403,
      message: ERROR_KEYS.INSUFFICIENT_PERMISSIONS_UPDATE,
    })
  }

  const newIsCompleted = !existingMemo.isCompleted
  const isOwner = existingMemo.userId === currentUser.id

  const sharedWithUsers = await db
    .select({ sharedWithId: memoShare.sharedWithId })
    .from(memoShare)
    .where(eq(memoShare.memoId, memoId))

  await db
    .update(memo)
    .set({
      isCompleted: newIsCompleted,
      updatedAt: new Date(),
    })
    .where(eq(memo.id, memoId))

  try {
    const { createNotification } = await import('~~/server/services/notifications')
    const truncatedContent = existingMemo.content.length > 50
      ? `${existingMemo.content.slice(0, 50)}...`
      : existingMemo.content

    const targetUserIds: string[] = []

    if (!isOwner) {
      targetUserIds.push(existingMemo.userId)
    }

    for (const share of sharedWithUsers) {
      if (share.sharedWithId !== currentUser.id && !targetUserIds.includes(share.sharedWithId)) {
        targetUserIds.push(share.sharedWithId)
      }
    }

    for (const targetUserId of targetUserIds) {
      await createNotification({
        sourceUserId: currentUser.id,
        budgetOwnerId: existingMemo.userId,
        targetUserId,
        type: 'memo_toggled',
        params: {
          username: currentUser.username,
          memoContent: truncatedContent,
          isCompleted: newIsCompleted,
        },
      })
    }
  }
  catch (error) {
    secureLog.error('Error creating memo toggle notification:', error)
  }

  return { isCompleted: newIsCompleted }
})
