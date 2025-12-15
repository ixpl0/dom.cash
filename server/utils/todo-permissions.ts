import { and, eq } from 'drizzle-orm'
import type { useDatabase } from '~~/server/db'
import { budgetShare, todo, todoShare } from '~~/server/db/schema'

export const getTodoRecipientIds = async (
  db: ReturnType<typeof useDatabase>,
  userId: string,
): Promise<Set<string>> => {
  const shares = await db
    .select({ ownerId: budgetShare.ownerId })
    .from(budgetShare)
    .where(eq(budgetShare.sharedWithId, userId))

  return new Set(shares.map(share => share.ownerId))
}

export const canEditTodo = async (
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
