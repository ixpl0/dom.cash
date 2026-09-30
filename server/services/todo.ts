import { and, count, desc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { createError, type H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { todo, todoShare, user } from '~~/server/db/schema'
import { resolveConnections, resolveSharedUsers } from '~~/server/services/connections'
import { sendNotification, type NotificationType } from '~~/server/services/notifications'
import { chunkArray, getRowsPerInsertStatement } from '~~/server/utils/d1-limits'
import type { User } from '~~/shared/types'
import type { CreateTodoPayload, TodoCompletionPayload, TodoConnection, TodoListItem, UpdateTodoPayload } from '~~/shared/types/todo'
import { ERROR_KEYS, type ErrorKey } from '~~/shared/utils/shared/error-keys'
import { PLAIN_DATE_LENGTH } from '~~/shared/utils/shared/dates'
import { getSeenPlannedDate } from '~~/shared/utils/todo'
import { calculateNextDate, formatDateForDb } from '~~/shared/utils/recurrence'

type TodoRow = typeof todo.$inferSelect

interface TodoAccess {
  todoRow: TodoRow
  ownerUsername: string
  sharedWith: TodoConnection[]
  isOwner: boolean
}

const NOTIFICATION_CONTENT_LENGTH = 50

const toTodoListItem = (todoRow: TodoRow, ownerUsername: string, sharedWith: TodoConnection[], viewerId: string): TodoListItem => ({
  id: todoRow.id,
  content: todoRow.content,
  isCompleted: todoRow.isCompleted ?? false,
  plannedDate: todoRow.plannedDate,
  recurrence: todoRow.recurrence ?? null,
  createdAt: todoRow.createdAt.toISOString(),
  updatedAt: todoRow.updatedAt.toISOString(),
  isOwner: todoRow.userId === viewerId,
  ownerUsername,
  sharedWith: sharedWith.filter(participant => participant.id !== viewerId),
})

const getParticipantIds = ({ todoRow, sharedWith }: TodoAccess): string[] =>
  [todoRow.userId, ...sharedWith.map(participant => participant.id)]

const notifyParticipants = async (
  event: H3Event,
  actor: User,
  todoRow: TodoRow,
  participantIds: readonly string[],
  type: NotificationType,
  isCompleted?: boolean,
): Promise<void> => {
  const todoContent = todoRow.content.length > NOTIFICATION_CONTENT_LENGTH
    ? `${todoRow.content.slice(0, NOTIFICATION_CONTENT_LENGTH)}...`
    : todoRow.content
  const targetUserIds = [...new Set(participantIds)].filter(userId => userId !== actor.id)

  await Promise.all(targetUserIds.map(targetUserId => sendNotification(event, {
    sourceUserId: actor.id,
    budgetOwnerId: todoRow.userId,
    targetUserId,
    type,
    params: isCompleted === undefined
      ? { username: actor.username, todoContent }
      : { username: actor.username, todoContent, isCompleted },
  })))
}

const buildShareInserts = (db: ReturnType<typeof useDatabase>, todoId: string, sharedUsers: readonly TodoConnection[], createdAt: Date) =>
  chunkArray(
    sharedUsers.map(sharedUser => ({ id: crypto.randomUUID(), todoId, sharedWithId: sharedUser.id, createdAt })),
    getRowsPerInsertStatement(todoShare),
  ).map(shareRows => db.insert(todoShare).values(shareRows))

const getTodoAccess = async (todoId: string, viewerId: string, forbiddenKey: ErrorKey, event: H3Event): Promise<TodoAccess> => {
  const db = useDatabase(event)
  const [found] = await db
    .select({ todoRow: todo, ownerUsername: user.username })
    .from(todo)
    .innerJoin(user, eq(todo.userId, user.id))
    .where(eq(todo.id, todoId))
    .limit(1)

  if (!found) {
    throw createError({
      statusCode: 404,
      message: ERROR_KEYS.TODO_NOT_FOUND,
    })
  }

  const sharedWith = await db
    .select({ id: user.id, username: user.username })
    .from(todoShare)
    .innerJoin(user, eq(todoShare.sharedWithId, user.id))
    .where(eq(todoShare.todoId, todoId))

  const isOwner = found.todoRow.userId === viewerId

  if (!isOwner && !sharedWith.some(participant => participant.id === viewerId)) {
    throw createError({
      statusCode: 403,
      message: forbiddenKey,
    })
  }

  return { ...found, sharedWith, isOwner }
}

const isVisibleTo = (db: ReturnType<typeof useDatabase>, viewerId: string) => or(
  eq(todo.userId, viewerId),
  inArray(todo.id, db.select({ todoId: todoShare.todoId }).from(todoShare).where(eq(todoShare.sharedWithId, viewerId))),
)

export const listTodos = async (viewerId: string, event: H3Event): Promise<TodoListItem[]> => {
  const db = useDatabase(event)
  const isVisibleTodo = isVisibleTo(db, viewerId)

  const [todoRows, shareRows] = await Promise.all([
    db
      .select({ todoRow: todo, ownerUsername: user.username })
      .from(todo)
      .innerJoin(user, eq(todo.userId, user.id))
      .where(isVisibleTodo)
      .orderBy(desc(todo.createdAt)),
    db
      .select({ todoId: todoShare.todoId, id: user.id, username: user.username })
      .from(todoShare)
      .innerJoin(user, eq(todoShare.sharedWithId, user.id))
      .where(inArray(todoShare.todoId, db.select({ id: todo.id }).from(todo).where(isVisibleTodo))),
  ])

  const sharedWithByTodoId = shareRows.reduce(
    (sharesMap, { todoId, id, username }) => sharesMap.set(todoId, [...(sharesMap.get(todoId) ?? []), { id, username }]),
    new Map<string, TodoConnection[]>(),
  )

  return todoRows.map(({ todoRow, ownerUsername }) =>
    toTodoListItem(todoRow, ownerUsername, sharedWithByTodoId.get(todoRow.id) ?? [], viewerId))
}

export const countOverdueTodos = async (viewerId: string, today: string, event: H3Event): Promise<number> => {
  const db = useDatabase(event)
  const [result] = await db
    .select({ overdueCount: count() })
    .from(todo)
    .where(and(
      isVisibleTo(db, viewerId),
      or(isNull(todo.isCompleted), eq(todo.isCompleted, false)),
      lte(sql`substr(${todo.plannedDate}, 1, ${PLAIN_DATE_LENGTH})`, today),
    ))

  return result?.overdueCount ?? 0
}

export const createTodo = async (actor: User, payload: CreateTodoPayload, event: H3Event): Promise<TodoListItem> => {
  const sharedWith = await resolveConnections(actor.id, payload.sharedWithUserIds ?? [], event)
  const now = new Date()
  const todoRow: TodoRow = {
    id: crypto.randomUUID(),
    userId: actor.id,
    content: payload.content,
    isCompleted: false,
    plannedDate: payload.plannedDate ?? null,
    recurrence: payload.recurrence ?? null,
    createdAt: now,
    updatedAt: now,
  }

  const db = useDatabase(event)
  await db.batch([
    db.insert(todo).values(todoRow),
    ...buildShareInserts(db, todoRow.id, sharedWith, now),
  ])

  await notifyParticipants(event, actor, todoRow, sharedWith.map(sharedUser => sharedUser.id), 'todo_created')

  return toTodoListItem(todoRow, actor.username, sharedWith, actor.id)
}

export const updateTodo = async (actor: User, todoId: string, payload: UpdateTodoPayload, event: H3Event): Promise<TodoListItem> => {
  const access = await getTodoAccess(todoId, actor.id, ERROR_KEYS.INSUFFICIENT_PERMISSIONS_UPDATE, event)

  if (!access.isOwner && payload.sharedWithUserIds !== undefined) {
    throw createError({
      statusCode: 403,
      message: ERROR_KEYS.CANNOT_MODIFY_SHARE_AS_NON_OWNER,
    })
  }

  const newSharedWith = payload.sharedWithUserIds === undefined
    ? null
    : await resolveSharedUsers(actor.id, payload.sharedWithUserIds, access.sharedWith, event)
  const recurrence = payload.recurrence === undefined ? access.todoRow.recurrence : payload.recurrence
  const updatedRow: TodoRow = {
    ...access.todoRow,
    content: payload.content ?? access.todoRow.content,
    plannedDate: payload.plannedDate === undefined ? access.todoRow.plannedDate : payload.plannedDate,
    recurrence,
    isCompleted: recurrence ? false : access.todoRow.isCompleted,
    updatedAt: new Date(),
  }

  const db = useDatabase(event)
  const { content, plannedDate, isCompleted, updatedAt } = updatedRow
  const replaceShares = newSharedWith
    ? [db.delete(todoShare).where(eq(todoShare.todoId, todoId)), ...buildShareInserts(db, todoId, newSharedWith, updatedAt)]
    : []

  await db.batch([
    db.update(todo).set({ content, plannedDate, recurrence, isCompleted, updatedAt }).where(eq(todo.id, todoId)),
    ...replaceShares,
  ])

  await notifyParticipants(event, actor, updatedRow, getParticipantIds(access), 'todo_updated')

  return toTodoListItem(updatedRow, access.ownerUsername, newSharedWith ?? access.sharedWith, actor.id)
}

const hasStoredPlannedDate = (plannedDate: string | null) =>
  plannedDate === null ? isNull(todo.plannedDate) : eq(todo.plannedDate, plannedDate)

const getCompletionChanges = ({ recurrence, plannedDate }: TodoRow, isCompleted: boolean, now: Date) => {
  if (recurrence && isCompleted) {
    const baseDate = plannedDate ? new Date(plannedDate) : now
    return { plannedDate: formatDateForDb(calculateNextDate(recurrence, baseDate)), isCompleted: false, updatedAt: now }
  }
  return { isCompleted, updatedAt: now }
}

export const setTodoCompletion = async (
  actor: User,
  todoId: string,
  { isCompleted, plannedDate: seenPlannedDate }: TodoCompletionPayload,
  event: H3Event,
): Promise<TodoListItem> => {
  const access = await getTodoAccess(todoId, actor.id, ERROR_KEYS.INSUFFICIENT_PERMISSIONS_UPDATE, event)
  const { todoRow, ownerUsername, sharedWith } = access
  const shouldMove = todoRow.recurrence !== null && isCompleted
  const hasRequestedState = !shouldMove && (todoRow.isCompleted ?? false) === isCompleted
  const hasSeenOtherDate = isCompleted && getSeenPlannedDate(todoRow) !== seenPlannedDate

  if (hasRequestedState || hasSeenOtherDate) {
    return toTodoListItem(todoRow, ownerUsername, sharedWith, actor.id)
  }

  const [updatedRow] = await useDatabase(event)
    .update(todo)
    .set(getCompletionChanges(todoRow, isCompleted, new Date()))
    .where(and(eq(todo.id, todoId), hasStoredPlannedDate(todoRow.plannedDate)))
    .returning()

  if (!updatedRow) {
    const current = await getTodoAccess(todoId, actor.id, ERROR_KEYS.INSUFFICIENT_PERMISSIONS_UPDATE, event)
    return toTodoListItem(current.todoRow, current.ownerUsername, current.sharedWith, actor.id)
  }

  await notifyParticipants(event, actor, todoRow, getParticipantIds(access), 'todo_toggled', updatedRow.isCompleted ?? false)

  return toTodoListItem(updatedRow, ownerUsername, sharedWith, actor.id)
}

export const deleteTodo = async (actor: User, todoId: string, event: H3Event): Promise<void> => {
  const access = await getTodoAccess(todoId, actor.id, ERROR_KEYS.INSUFFICIENT_PERMISSIONS_DELETE, event)

  await useDatabase(event).delete(todo).where(eq(todo.id, todoId))

  await notifyParticipants(event, actor, access.todoRow, getParticipantIds(access), 'todo_deleted')
}
