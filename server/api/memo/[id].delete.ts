import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { memo, memoShare } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import { secureLog } from '~~/server/utils/secure-logger'

const isOwner = async (
  db: ReturnType<typeof useDatabase>,
  memoId: string,
  userId: string,
): Promise<boolean> => {
  const memoRecord = await db
    .select({ userId: memo.userId })
    .from(memo)
    .where(eq(memo.id, memoId))
    .limit(1)

  return memoRecord.length > 0 && memoRecord[0]?.userId === userId
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

  const ownerCheck = await isOwner(db, memoId, currentUser.id)
  if (!ownerCheck) {
    throw createError({
      statusCode: 403,
      message: ERROR_KEYS.INSUFFICIENT_PERMISSIONS_DELETE,
    })
  }

  const existingMemo = memoRecord[0]
  const sharedWithUsers = await db
    .select({ sharedWithId: memoShare.sharedWithId })
    .from(memoShare)
    .where(eq(memoShare.memoId, memoId))

  await db.delete(memo).where(eq(memo.id, memoId))

  if (existingMemo && sharedWithUsers.length > 0) {
    try {
      const { createNotification } = await import('~~/server/services/notifications')
      const truncatedContent = existingMemo.content.length > 50
        ? `${existingMemo.content.slice(0, 50)}...`
        : existingMemo.content

      for (const share of sharedWithUsers) {
        await createNotification({
          sourceUserId: currentUser.id,
          budgetOwnerId: currentUser.id,
          targetUserId: share.sharedWithId,
          type: 'memo_deleted',
          params: {
            username: currentUser.username,
            memoContent: truncatedContent,
          },
        })
      }
    }
    catch (error) {
      secureLog.error('Error creating memo delete notification:', error)
    }
  }

  return { success: true }
})
