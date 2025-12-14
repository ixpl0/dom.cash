import { eq, and } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { todo, todoShare } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import { secureLog } from '~~/server/utils/secure-logger'

const canEditTodo = async (
  db: ReturnType<typeof useDatabase>,
  todoId: string,
  userId: string,
): Promise<boolean> => {
  const todoRecord = await db
    .select({ userId: todo.userId })
    .from(todo)
    .where(eq(todo.id, todoId))
    .limit(1)

  if (todoRecord.length > 0 && todoRecord[0]?.userId === userId) {
    return true
  }

  const shareRecord = await db
    .select({ id: todoShare.id })
    .from(todoShare)
    .where(and(
      eq(todoShare.todoId, todoId),
      eq(todoShare.sharedWithId, userId),
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
  if (!existingTodo) {
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

  const newIsCompleted = !existingTodo.isCompleted
  const isOwner = existingTodo.userId === currentUser.id

  const sharedWithUsers = await db
    .select({ sharedWithId: todoShare.sharedWithId })
    .from(todoShare)
    .where(eq(todoShare.todoId, todoId))

  await db
    .update(todo)
    .set({
      isCompleted: newIsCompleted,
      updatedAt: new Date(),
    })
    .where(eq(todo.id, todoId))

  try {
    const { createNotification } = await import('~~/server/services/notifications')
    const truncatedContent = existingTodo.content.length > 50
      ? `${existingTodo.content.slice(0, 50)}...`
      : existingTodo.content

    const targetUserIds: string[] = []

    if (!isOwner) {
      targetUserIds.push(existingTodo.userId)
    }

    for (const share of sharedWithUsers) {
      if (share.sharedWithId !== currentUser.id && !targetUserIds.includes(share.sharedWithId)) {
        targetUserIds.push(share.sharedWithId)
      }
    }

    for (const targetUserId of targetUserIds) {
      await createNotification({
        sourceUserId: currentUser.id,
        budgetOwnerId: existingTodo.userId,
        targetUserId,
        type: 'todo_toggled',
        params: {
          username: currentUser.username,
          todoContent: truncatedContent,
          isCompleted: newIsCompleted,
        },
      })
    }
  }
  catch (error) {
    secureLog.error('Error creating todo toggle notification:', error)
  }

  return { isCompleted: newIsCompleted }
})
