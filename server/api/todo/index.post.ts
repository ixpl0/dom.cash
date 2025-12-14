import { inArray } from 'drizzle-orm'
import { z } from 'zod'
import { useDatabase } from '~~/server/db'
import { todo, todoShare, user } from '~~/server/db/schema'
import type { NewTodo, NewTodoShare } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import { secureLog } from '~~/server/utils/secure-logger'
import { getTodoRecipientIds } from '~~/server/utils/todo-permissions'
import type { TodoListItem } from '~~/shared/types/todo'

const createTodoSchema = z.object({
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
  const { content, plannedDate, sharedWithUserIds } = createTodoSchema.parse(body)

  if (sharedWithUserIds && sharedWithUserIds.length > 0) {
    const recipientIds = await getTodoRecipientIds(db, currentUser.id)
    const invalidUserIds = sharedWithUserIds.filter(id => !recipientIds.has(id))
    if (invalidUserIds.length > 0) {
      throw createError({
        statusCode: 400,
        message: ERROR_KEYS.INVALID_SHARED_USER,
      })
    }
  }

  const now = new Date()
  const newTodo: NewTodo = {
    id: crypto.randomUUID(),
    userId: currentUser.id,
    content,
    isCompleted: false,
    plannedDate: plannedDate ?? null,
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(todo).values(newTodo)

  if (sharedWithUserIds && sharedWithUserIds.length > 0) {
    const shares: NewTodoShare[] = sharedWithUserIds.map(userId => ({
      id: crypto.randomUUID(),
      todoId: newTodo.id,
      sharedWithId: userId,
      createdAt: now,
    }))
    await db.insert(todoShare).values(shares)

    try {
      const { createNotification } = await import('~~/server/services/notifications')
      const truncatedContent = content.length > 50 ? `${content.slice(0, 50)}...` : content
      for (const targetUserId of sharedWithUserIds) {
        await createNotification({
          sourceUserId: currentUser.id,
          budgetOwnerId: currentUser.id,
          targetUserId,
          type: 'todo_created',
          params: {
            username: currentUser.username,
            todoContent: truncatedContent,
          },
        })
      }
    }
    catch (error) {
      secureLog.error('Error creating todo notification:', error)
    }
  }

  let sharedWithUsers: Array<{ id: string, username: string }> = []
  if (sharedWithUserIds && sharedWithUserIds.length > 0) {
    const users = await db
      .select({ id: user.id, username: user.username })
      .from(user)
      .where(inArray(user.id, sharedWithUserIds))
    sharedWithUsers = users
  }

  const response: TodoListItem = {
    id: newTodo.id,
    content,
    isCompleted: false,
    plannedDate: plannedDate ?? null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    isOwner: true,
    ownerUsername: currentUser.username,
    sharedWith: sharedWithUsers,
  }

  return response
})
