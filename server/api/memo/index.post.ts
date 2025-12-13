import { z } from 'zod'
import { useDatabase } from '~~/server/db'
import { memo, memoShare } from '~~/server/db/schema'
import type { NewMemo, NewMemoShare } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import { secureLog } from '~~/server/utils/secure-logger'

const createMemoSchema = z.object({
  type: z.enum(['todo', 'memo', 'plan']),
  content: z.string().min(1).max(10000),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).optional(),
  sharedWithUserIds: z.array(z.string()).optional(),
})

export default defineEventHandler(async (event) => {
  const db = useDatabase(event)
  const currentUser = await getUserFromRequest(event)
  if (!currentUser) {
    throw createError({
      statusCode: 401,
      message: ERROR_KEYS.UNAUTHORIZED,
    })
  }

  const body = await readBody(event)
  const { type, content, plannedDate, sharedWithUserIds } = createMemoSchema.parse(body)

  const now = new Date()
  const newMemo: NewMemo = {
    id: crypto.randomUUID(),
    userId: currentUser.id,
    type,
    content,
    isCompleted: false,
    plannedDate: type === 'plan' ? plannedDate ?? null : null,
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(memo).values(newMemo)

  if (sharedWithUserIds && sharedWithUserIds.length > 0) {
    const shares: NewMemoShare[] = sharedWithUserIds.map(userId => ({
      id: crypto.randomUUID(),
      memoId: newMemo.id,
      sharedWithId: userId,
      createdAt: now,
    }))
    await db.insert(memoShare).values(shares)

    try {
      const { createNotification } = await import('~~/server/services/notifications')
      const truncatedContent = content.length > 50 ? `${content.slice(0, 50)}...` : content
      for (const targetUserId of sharedWithUserIds) {
        await createNotification({
          sourceUserId: currentUser.id,
          budgetOwnerId: currentUser.id,
          targetUserId,
          type: 'memo_created',
          params: {
            username: currentUser.username,
            memoContent: truncatedContent,
          },
        })
      }
    }
    catch (error) {
      secureLog.error('Error creating memo notification:', error)
    }
  }

  return {
    id: newMemo.id,
    type: newMemo.type,
    content: newMemo.content,
    isCompleted: newMemo.isCompleted,
    plannedDate: newMemo.plannedDate,
    createdAt: newMemo.createdAt.toISOString(),
    updatedAt: newMemo.updatedAt.toISOString(),
  }
})
