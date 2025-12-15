import { and, eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { todo, todoShare } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import { secureLog } from '~~/server/utils/secure-logger'

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

  const existingTodo = todoRecord[0]
  const isOwner = existingTodo?.userId === currentUser.id

  const shareRecord = await db
    .select()
    .from(todoShare)
    .where(and(
      eq(todoShare.todoId, todoId),
      eq(todoShare.sharedWithId, currentUser.id),
    ))
    .limit(1)

  const hasAccess = isOwner || shareRecord.length > 0

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      message: ERROR_KEYS.INSUFFICIENT_PERMISSIONS_DELETE,
    })
  }

  const sharedWithUsers = await db
    .select({ sharedWithId: todoShare.sharedWithId })
    .from(todoShare)
    .where(eq(todoShare.todoId, todoId))

  await db.delete(todo).where(eq(todo.id, todoId))

  const usersToNotify = isOwner
    ? sharedWithUsers.map(s => s.sharedWithId)
    : [existingTodo?.userId, ...sharedWithUsers.map(s => s.sharedWithId)].filter((id): id is string => id !== undefined && id !== currentUser.id)

  if (existingTodo && usersToNotify.length > 0) {
    try {
      const { createNotification } = await import('~~/server/services/notifications')
      const truncatedContent = existingTodo.content.length > 50
        ? `${existingTodo.content.slice(0, 50)}...`
        : existingTodo.content

      for (const targetUserId of usersToNotify) {
        await createNotification({
          sourceUserId: currentUser.id,
          budgetOwnerId: existingTodo.userId,
          targetUserId,
          type: 'todo_deleted',
          params: {
            username: currentUser.username,
            todoContent: truncatedContent,
          },
        })
      }
    }
    catch (error) {
      secureLog.error('Error creating todo delete notification:', error)
    }
  }

  return { success: true }
})
