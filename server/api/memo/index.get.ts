import { eq, or, desc } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { memo, memoShare, user } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import type { MemoListItem, MemoData } from '~~/shared/types/memo'

export default defineEventHandler(async (event): Promise<MemoData> => {
  const db = useDatabase(event)
  const currentUser = await getUserFromRequest(event)
  if (!currentUser) {
    throw createError({
      statusCode: 401,
      message: ERROR_KEYS.UNAUTHORIZED,
    })
  }

  const sharedWithMe = await db
    .select({ memoId: memoShare.memoId })
    .from(memoShare)
    .where(eq(memoShare.sharedWithId, currentUser.id))

  const sharedMemoIds = sharedWithMe.map(s => s.memoId)

  const memos = await db
    .select({
      id: memo.id,
      type: memo.type,
      content: memo.content,
      isCompleted: memo.isCompleted,
      plannedDate: memo.plannedDate,
      createdAt: memo.createdAt,
      updatedAt: memo.updatedAt,
      userId: memo.userId,
      ownerUsername: user.username,
    })
    .from(memo)
    .innerJoin(user, eq(memo.userId, user.id))
    .where(
      sharedMemoIds.length > 0
        ? or(
            eq(memo.userId, currentUser.id),
            ...sharedMemoIds.map(id => eq(memo.id, id)),
          )
        : eq(memo.userId, currentUser.id),
    )
    .orderBy(desc(memo.createdAt))

  const allShares = await db
    .select({
      memoId: memoShare.memoId,
      userId: memoShare.sharedWithId,
      username: user.username,
    })
    .from(memoShare)
    .innerJoin(user, eq(memoShare.sharedWithId, user.id))

  const sharesByMemoId = new Map<string, Array<{ id: string, username: string }>>()
  allShares.forEach((share) => {
    const existing = sharesByMemoId.get(share.memoId) ?? []
    sharesByMemoId.set(share.memoId, [...existing, { id: share.userId, username: share.username }])
  })

  const items: MemoListItem[] = memos.map(m => ({
    id: m.id,
    type: m.type,
    content: m.content,
    isCompleted: m.isCompleted ?? false,
    plannedDate: m.plannedDate,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    isOwner: m.userId === currentUser.id,
    ownerUsername: m.ownerUsername,
    sharedWith: (sharesByMemoId.get(m.id) ?? []).filter(s => s.id !== currentUser.id),
  }))

  return { items }
})
