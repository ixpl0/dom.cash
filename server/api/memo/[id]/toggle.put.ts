import { eq, and } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { memo, memoShare } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

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

  if (existingMemo.type !== 'todo') {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.MEMO_NOT_TODO,
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

  await db
    .update(memo)
    .set({
      isCompleted: newIsCompleted,
      updatedAt: new Date(),
    })
    .where(eq(memo.id, memoId))

  return { isCompleted: newIsCompleted }
})
