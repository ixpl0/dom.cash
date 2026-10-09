import { and, asc, eq, exists, isNull, lte, ne, or, sql } from 'drizzle-orm'
import type { Database } from '~~/server/db'
import { pushSubscription, todo, todoDigestSettings, type TodoDigestSettingsRow } from '~~/server/db/schema'
import { deleteGoneSubscriptions, deliverPushMessage, type PushDeliveryResult } from '~~/server/services/push'
import { isVisibleTo } from '~~/server/services/todo'
import { buildTodoDigestMessage, isTodoDigestDue, isUndatedReminderDue, type DigestTodo } from '~~/server/utils/todo-digest'
import type { PushOptions, PushSender } from '~~/server/utils/web-push'
import { TODO_DIGEST_TAG } from '~~/shared/schemas/push'
import { getPlainDate, PLAIN_DATE_LENGTH } from '~~/shared/utils/shared/dates'
import { getZonedTime, type ZonedTime } from '~~/shared/utils/shared/time-zones'

export interface TodoDigestRunResult {
  userCount: number
  deliveredCount: number
  goneCount: number
}

interface DueDigest {
  settings: TodoDigestSettingsRow
  zonedTime: ZonedTime
}

const MAX_DIGESTS_PER_RUN = 10

const DIGEST_PUSH_OPTIONS: PushOptions = {
  ttlSeconds: 12 * 60 * 60,
  urgency: 'normal',
  topic: TODO_DIGEST_TAG,
}

const readZonedTime = (now: Date, timeZone: string): ZonedTime | null => {
  try {
    return getZonedTime(now, timeZone)
  }
  catch {
    return null
  }
}

export const listDigestTodos = async (userId: string, today: string, database: Database): Promise<DigestTodo[]> => {
  const todoRows = await database
    .select({ id: todo.id, content: todo.content, plannedDate: todo.plannedDate })
    .from(todo)
    .where(and(
      isVisibleTo(database, userId),
      or(isNull(todo.isCompleted), eq(todo.isCompleted, false)),
      or(isNull(todo.plannedDate), lte(sql`substr(${todo.plannedDate}, 1, ${PLAIN_DATE_LENGTH})`, today)),
    ))
    .orderBy(asc(todo.plannedDate), asc(todo.createdAt))

  return todoRows.map(({ id, content, plannedDate }) => ({
    id,
    content,
    plannedDate: plannedDate === null ? null : getPlainDate(plannedDate),
  }))
}

const isUndatedReminderDueFor = ({ undatedMode, lastUndatedDate }: TodoDigestSettingsRow, today: string): boolean =>
  isUndatedReminderDue(undatedMode, lastUndatedDate, today)

export const deliverTodoDigest = async (
  settings: TodoDigestSettingsRow,
  today: string,
  database: Database,
  send: PushSender,
): Promise<PushDeliveryResult> => {
  const message = buildTodoDigestMessage(await listDigestTodos(settings.userId, today, database), {
    today,
    overdueMode: settings.overdueMode,
    includeUndated: isUndatedReminderDueFor(settings, today),
    locale: settings.locale,
  })

  if (!message) {
    return { deliveredCount: 0, goneIds: [] }
  }

  const subscriptions = await database
    .select()
    .from(pushSubscription)
    .where(eq(pushSubscription.userId, settings.userId))

  return deliverPushMessage(subscriptions, message, DIGEST_PUSH_OPTIONS, send)
}

const findDueDigests = async (database: Database, now: Date): Promise<DueDigest[]> => {
  const candidates = await database
    .select()
    .from(todoDigestSettings)
    .where(exists(database
      .select({ id: pushSubscription.id })
      .from(pushSubscription)
      .where(eq(pushSubscription.userId, todoDigestSettings.userId))))

  return candidates
    .flatMap((settings) => {
      const zonedTime = readZonedTime(now, settings.timeZone)
      return zonedTime && isTodoDigestDue(settings, zonedTime) ? [{ settings, zonedTime }] : []
    })
    .slice(0, MAX_DIGESTS_PER_RUN)
}

const claimDueDigests = async (dueDigests: readonly DueDigest[], database: Database): Promise<DueDigest[]> => {
  const [firstClaim, ...otherClaims] = dueDigests.map(({ settings, zonedTime }) => database
    .update(todoDigestSettings)
    .set(isUndatedReminderDueFor(settings, zonedTime.date)
      ? { lastSentDate: zonedTime.date, lastUndatedDate: zonedTime.date }
      : { lastSentDate: zonedTime.date })
    .where(and(
      eq(todoDigestSettings.userId, settings.userId),
      or(isNull(todoDigestSettings.lastSentDate), ne(todoDigestSettings.lastSentDate, zonedTime.date)),
    ))
    .returning({ userId: todoDigestSettings.userId }))

  if (!firstClaim) {
    return []
  }

  const claimedUserIds = new Set((await database.batch([firstClaim, ...otherClaims])).flat().map(({ userId }) => userId))

  return dueDigests.filter(({ settings }) => claimedUserIds.has(settings.userId))
}

export const sendTodoDigests = async (database: Database, now: Date, send: PushSender): Promise<TodoDigestRunResult> => {
  const claimedDigests = await claimDueDigests(await findDueDigests(database, now), database)
  const results = await Promise.all(claimedDigests.map(({ settings, zonedTime }) => deliverTodoDigest(settings, zonedTime.date, database, send)))
  const goneIds = results.flatMap(result => result.goneIds)

  await deleteGoneSubscriptions(goneIds, database)

  return {
    userCount: claimedDigests.length,
    deliveredCount: results.reduce((total, result) => total + result.deliveredCount, 0),
    goneCount: goneIds.length,
  }
}
