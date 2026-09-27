import { desc, eq, inArray, or } from 'drizzle-orm'
import { useDatabase } from '~~/server/db'
import { todo, todoShare, user } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/session'
import type { RecurrencePattern } from '~~/shared/types/recurrence'
import type { TodoListItem, TodoData } from '~~/shared/types/todo'

export default defineEventHandler(async (event): Promise<TodoData> => {
  const db = useDatabase(event)
  const currentUser = await requireAuth(event)

  const todosSharedWithMe = db
    .select({ todoId: todoShare.todoId })
    .from(todoShare)
    .where(eq(todoShare.sharedWithId, currentUser.id))

  const isVisibleTodo = or(
    eq(todo.userId, currentUser.id),
    inArray(todo.id, todosSharedWithMe),
  )

  const visibleTodoIds = db
    .select({ id: todo.id })
    .from(todo)
    .where(isVisibleTodo)

  const todos = await db
    .select({
      id: todo.id,
      content: todo.content,
      isCompleted: todo.isCompleted,
      plannedDate: todo.plannedDate,
      recurrence: todo.recurrence,
      createdAt: todo.createdAt,
      updatedAt: todo.updatedAt,
      userId: todo.userId,
      ownerUsername: user.username,
    })
    .from(todo)
    .innerJoin(user, eq(todo.userId, user.id))
    .where(isVisibleTodo)
    .orderBy(desc(todo.createdAt))

  const visibleShares = await db
    .select({
      todoId: todoShare.todoId,
      userId: todoShare.sharedWithId,
      username: user.username,
    })
    .from(todoShare)
    .innerJoin(user, eq(todoShare.sharedWithId, user.id))
    .where(inArray(todoShare.todoId, visibleTodoIds))

  const sharesByTodoId = visibleShares.reduce((sharesMap, share) => {
    const existing = sharesMap.get(share.todoId) ?? []
    return sharesMap.set(share.todoId, [...existing, { id: share.userId, username: share.username }])
  }, new Map<string, Array<{ id: string, username: string }>>())

  const items: TodoListItem[] = todos.map(t => ({
    id: t.id,
    content: t.content,
    isCompleted: t.isCompleted ?? false,
    plannedDate: t.plannedDate,
    recurrence: (t.recurrence as RecurrencePattern | null) ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    isOwner: t.userId === currentUser.id,
    ownerUsername: t.ownerUsername,
    sharedWith: (sharesByTodoId.get(t.id) ?? []).filter(s => s.id !== currentUser.id),
  }))

  return { items }
})
