import { eq, or, desc } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { todo, todoShare, user } from '~~/server/db/schema'
import { getUserFromRequest } from '~~/server/utils/auth'
import { ERROR_KEYS } from '~~/server/utils/error-keys'
import type { TodoListItem, TodoData } from '~~/shared/types/todo'

export default defineEventHandler(async (event): Promise<TodoData> => {
  const db = useDatabase(event)
  const currentUser = await getUserFromRequest(event)
  if (!currentUser) {
    throw createError({
      statusCode: 401,
      message: ERROR_KEYS.UNAUTHORIZED,
    })
  }

  const sharedWithMe = await db
    .select({ todoId: todoShare.todoId })
    .from(todoShare)
    .where(eq(todoShare.sharedWithId, currentUser.id))

  const sharedTodoIds = sharedWithMe.map(s => s.todoId)

  const todos = await db
    .select({
      id: todo.id,
      content: todo.content,
      isCompleted: todo.isCompleted,
      plannedDate: todo.plannedDate,
      createdAt: todo.createdAt,
      updatedAt: todo.updatedAt,
      userId: todo.userId,
      ownerUsername: user.username,
    })
    .from(todo)
    .innerJoin(user, eq(todo.userId, user.id))
    .where(
      sharedTodoIds.length > 0
        ? or(
            eq(todo.userId, currentUser.id),
            ...sharedTodoIds.map(id => eq(todo.id, id)),
          )
        : eq(todo.userId, currentUser.id),
    )
    .orderBy(desc(todo.createdAt))

  const allShares = await db
    .select({
      todoId: todoShare.todoId,
      userId: todoShare.sharedWithId,
      username: user.username,
    })
    .from(todoShare)
    .innerJoin(user, eq(todoShare.sharedWithId, user.id))

  const sharesByTodoId = new Map<string, Array<{ id: string, username: string }>>()
  allShares.forEach((share) => {
    const existing = sharesByTodoId.get(share.todoId) ?? []
    sharesByTodoId.set(share.todoId, [...existing, { id: share.userId, username: share.username }])
  })

  const items: TodoListItem[] = todos.map(t => ({
    id: t.id,
    content: t.content,
    isCompleted: t.isCompleted ?? false,
    plannedDate: t.plannedDate,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    isOwner: t.userId === currentUser.id,
    ownerUsername: t.ownerUsername,
    sharedWith: (sharesByTodoId.get(t.id) ?? []).filter(s => s.id !== currentUser.id),
  }))

  return { items }
})
