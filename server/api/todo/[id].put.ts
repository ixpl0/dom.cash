import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDatabase } from '~~/server/db'
import { todo, todoShare } from '~~/server/db/schema'
import type { NewTodoShare } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import { secureLog } from '~~/server/utils/secure-logger'
import { canEditTodo, getTodoRecipientIds } from '~~/server/utils/todo-permissions'
import { parseBody } from '~~/server/utils/validation'
import { recurrencePatternSchema } from '~~/shared/schemas/recurrence'

const updateTodoSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).nullable().optional(),
  recurrence: recurrencePatternSchema.nullable().optional(),
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

  const todoId = getRouterParam(event, 'id')
  if (!todoId) {
    throw createError({
      statusCode: 400,
      message: ERROR_KEYS.TODO_ID_REQUIRED,
    })
  }

  const todoRecord = await db
    .select()
    .from(todo)
    .where(eq(todo.id, todoId))
    .limit(1)

  if (todoRecord.length === 0) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.TODO_NOT_FOUND,
    })
  }

  const canEdit = await canEditTodo(db, todoId, currentUser.id)
  if (!canEdit) {
    throw createError({
      statusCode: 403,
      message: ERROR_KEYS.INSUFFICIENT_PERMISSIONS_UPDATE,
    })
  }

  const { content, plannedDate, recurrence, sharedWithUserIds } = await parseBody(event, updateTodoSchema)

  const existingTodo = todoRecord[0]
  if (!existingTodo) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.TODO_NOT_FOUND,
    })
  }

  const isOwner = existingTodo.userId === currentUser.id

  if (!isOwner && sharedWithUserIds !== undefined) {
    throw createError({
      statusCode: 403,
      message: ERROR_KEYS.CANNOT_MODIFY_SHARE_AS_NON_OWNER,
    })
  }

  if (isOwner && sharedWithUserIds && sharedWithUserIds.length > 0) {
    const recipientIds = await getTodoRecipientIds(db, currentUser.id)
    const invalidUserIds = sharedWithUserIds.filter(id => !recipientIds.has(id))
    if (invalidUserIds.length > 0) {
      throw createError({
        statusCode: 400,
        message: ERROR_KEYS.INVALID_SHARED_USER,
      })
    }
  }

  const currentShares = await db
    .select({ sharedWithId: todoShare.sharedWithId })
    .from(todoShare)
    .where(eq(todoShare.todoId, todoId))

  const updates: Partial<typeof todo.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (content !== undefined) {
    updates.content = content
  }

  if (plannedDate !== undefined) {
    updates.plannedDate = plannedDate
  }

  if (recurrence !== undefined) {
    updates.recurrence = recurrence
  }

  await db.update(todo).set(updates).where(eq(todo.id, todoId))

  if (isOwner && sharedWithUserIds !== undefined) {
    await db.delete(todoShare).where(eq(todoShare.todoId, todoId))

    if (sharedWithUserIds.length > 0) {
      const now = new Date()
      const shares: NewTodoShare[] = sharedWithUserIds.map(userId => ({
        id: crypto.randomUUID(),
        todoId,
        sharedWithId: userId,
        createdAt: now,
      }))
      await db.insert(todoShare).values(shares)
    }
  }

  try {
    const { createNotification } = await import('~~/server/services/notifications')
    const todoContent = content ?? existingTodo.content
    const truncatedContent = todoContent.length > 50 ? `${todoContent.slice(0, 50)}...` : todoContent

    const targetUserIds: string[] = []

    if (!isOwner) {
      targetUserIds.push(existingTodo.userId)
    }

    for (const share of currentShares) {
      if (share.sharedWithId !== currentUser.id && !targetUserIds.includes(share.sharedWithId)) {
        targetUserIds.push(share.sharedWithId)
      }
    }

    for (const targetUserId of targetUserIds) {
      await createNotification({
        sourceUserId: currentUser.id,
        budgetOwnerId: existingTodo.userId,
        targetUserId,
        type: 'todo_updated',
        params: {
          username: currentUser.username,
          todoContent: truncatedContent,
        },
      })
    }
  }
  catch (error) {
    secureLog.error('Error creating todo update notification:', error)
  }

  return { success: true }
})
