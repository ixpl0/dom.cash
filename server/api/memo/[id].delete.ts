import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { memo } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

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

  await db.delete(memo).where(eq(memo.id, memoId))

  return { success: true }
})
