import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { useDatabase } from '~~/server/db'
import { memo, memoShare } from '~~/server/db/schema'
import type { NewMemoShare } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'

const updateMemoSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  sharedWithUserIds: z.array(z.string()).optional(),
})

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

  const canEdit = await canEditMemo(db, memoId, currentUser.id)
  if (!canEdit) {
    throw createError({
      statusCode: 403,
      message: ERROR_KEYS.INSUFFICIENT_PERMISSIONS_UPDATE,
    })
  }

  const body = await readBody(event)
  const { content, plannedDate, sharedWithUserIds } = updateMemoSchema.parse(body)

  const existingMemo = memoRecord[0]
  if (!existingMemo) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.MEMO_NOT_FOUND,
    })
  }

  const isOwner = existingMemo.userId === currentUser.id

  const updates: Partial<typeof memo.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (content !== undefined) {
    updates.content = content
  }

  if (plannedDate !== undefined) {
    updates.plannedDate = plannedDate
    updates.type = plannedDate ? 'plan' : 'todo'
  }

  await db.update(memo).set(updates).where(eq(memo.id, memoId))

  if (isOwner && sharedWithUserIds !== undefined) {
    await db.delete(memoShare).where(eq(memoShare.memoId, memoId))

    if (sharedWithUserIds.length > 0) {
      const now = new Date()
      const shares: NewMemoShare[] = sharedWithUserIds.map(userId => ({
        id: crypto.randomUUID(),
        memoId,
        sharedWithId: userId,
        createdAt: now,
      }))
      await db.insert(memoShare).values(shares)
    }
  }

  return { success: true }
})
