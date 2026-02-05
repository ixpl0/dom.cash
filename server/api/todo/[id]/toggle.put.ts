import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDatabase } from '~~/server/db'
import { todo, todoShare } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import { secureLog } from '~~/server/utils/secure-logger'
import { canEditTodo } from '~~/server/utils/todo-permissions'
import { parseBody } from '~~/server/utils/validation'
import { dateReferenceSchema } from '~~/shared/schemas/recurrence'
import type { RecurrencePattern } from '~~/shared/types/recurrence'
import type { ToggleResult } from '~~/shared/types/todo'
import { calculateNextDate, formatDateForDb } from '~~/shared/utils/recurrence'

const toggleTodoSchema = z.object({
  reference: dateReferenceSchema.optional(),
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

  const { reference } = await parseBody(event, toggleTodoSchema.default({}))

  const isOwner = existingTodo.userId === currentUser.id

  const sharedWithUsers = await db
    .select({ sharedWithId: todoShare.sharedWithId })
    .from(todoShare)
    .where(eq(todoShare.todoId, todoId))

  const recurrence = existingTodo.recurrence as RecurrencePattern | null

  if (recurrence) {
    const baseDate = existingTodo.plannedDate
      ? new Date(existingTodo.plannedDate)
      : new Date()

    const nextDate = calculateNextDate(
      recurrence,
      baseDate,
      reference ?? 'planned',
    )

    const newPlannedDate = formatDateForDb(nextDate)

    await db
      .update(todo)
      .set({
        plannedDate: newPlannedDate,
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
            isCompleted: false,
          },
        })
      }
    }
    catch (error) {
      secureLog.error('Error creating todo toggle notification:', error)
    }

    const result: ToggleResult = {
      isCompleted: false,
      plannedDate: newPlannedDate,
      isRecurring: true,
    }

    return result
  }

  const newIsCompleted = !existingTodo.isCompleted

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

  const result: ToggleResult = {
    isCompleted: newIsCompleted,
    isRecurring: false,
  }

  return result
})
