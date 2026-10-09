import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import type { Database } from '~~/server/db'
import { pushSubscription, todoDigestSettings, type PushSubscriptionRow, type TodoDigestSettingsRow } from '~~/server/db/schema'
import type { AuthSession } from '~~/server/utils/session'
import { secureLog } from '~~/server/utils/secure-logger'
import { isTestMode } from '~~/server/utils/test-mode'
import { recordTestPush } from '~~/server/utils/test-push-recorder'
import { buildTestPushMessage } from '~~/server/utils/todo-digest'
import { createWebPushSender, isValidVapidKeyPair, type PushOptions, type PushSender, type VapidKeys } from '~~/server/utils/web-push'
import { DEFAULT_TODO_DIGEST_SETTINGS } from '~~/shared/schemas/push'
import type { PushDevice, PushMessage, PushTestResult, TodoDigestSettings } from '~~/shared/types/push'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import { DEFAULT_LOCALE } from '~~/shared/utils/shared/locale'

export interface PushDeliveryResult {
  deliveredCount: number
  goneIds: string[]
}

const DEFAULT_VAPID_SUBJECT = 'https://domcash.ixplo.ai'
const DEFAULT_TIME_ZONE = 'UTC'
const TEST_MODE_PUBLIC_KEY = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8'
const TEST_PUSH_OPTIONS: PushOptions = { ttlSeconds: 60 * 60, urgency: 'high' }

export const readVapidKeys = (): VapidKeys | null => {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()

  if (!publicKey || !privateKey) {
    return null
  }

  if (!isValidVapidKeyPair(publicKey, privateKey)) {
    secureLog.error('Push notifications are off: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must hold only the base64url values that pnpm push:keys prints after "="')
    return null
  }

  return { publicKey, privateKey, subject: process.env.VAPID_SUBJECT?.trim() || DEFAULT_VAPID_SUBJECT }
}

export const getPushPublicKey = (): string | null =>
  readVapidKeys()?.publicKey ?? (isTestMode() ? TEST_MODE_PUBLIC_KEY : null)

export const getPushSender = (now: Date): PushSender | null => {
  const vapidKeys = readVapidKeys()

  if (vapidKeys) {
    return createWebPushSender(vapidKeys, now)
  }

  return isTestMode() ? recordTestPush : null
}

const toSettings = ({ digestTime, weekdays, overdueMode }: TodoDigestSettingsRow): TodoDigestSettings => ({ digestTime, weekdays, overdueMode })

const createSettingsRow = (userId: string, overrides: Partial<TodoDigestSettingsRow>): TodoDigestSettingsRow => ({
  userId,
  ...DEFAULT_TODO_DIGEST_SETTINGS,
  timeZone: DEFAULT_TIME_ZONE,
  locale: DEFAULT_LOCALE,
  lastSentDate: null,
  ...overrides,
})

export const getTodoDigestSettings = async (userId: string, database: Database): Promise<TodoDigestSettings> => {
  const [settingsRow] = await database
    .select()
    .from(todoDigestSettings)
    .where(eq(todoDigestSettings.userId, userId))
    .limit(1)

  return settingsRow ? toSettings(settingsRow) : DEFAULT_TODO_DIGEST_SETTINGS
}

export const updateTodoDigestSettings = async (userId: string, settings: TodoDigestSettings, database: Database): Promise<TodoDigestSettings> => {
  const [settingsRow] = await database
    .insert(todoDigestSettings)
    .values(createSettingsRow(userId, settings))
    .onConflictDoUpdate({ target: todoDigestSettings.userId, set: settings })
    .returning()

  return settingsRow ? toSettings(settingsRow) : settings
}

export const savePushDevice = async ({ sessionId, user }: AuthSession, device: PushDevice, database: Database, now: Date): Promise<void> => {
  const { endpoint, keys: { p256dh, auth }, timeZone, locale } = device
  const deviceSettings = locale ? { timeZone, locale } : { timeZone }

  await database.batch([
    database
      .insert(pushSubscription)
      .values({ id: crypto.randomUUID(), userId: user.id, sessionId, endpoint, p256dh, auth, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: pushSubscription.endpoint, set: { userId: user.id, sessionId, p256dh, auth, updatedAt: now } }),
    database
      .insert(todoDigestSettings)
      .values(createSettingsRow(user.id, deviceSettings))
      .onConflictDoUpdate({ target: todoDigestSettings.userId, set: deviceSettings }),
  ])
}

export const removePushDevice = async (userId: string, endpoint: string, database: Database): Promise<void> => {
  await database
    .delete(pushSubscription)
    .where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.endpoint, endpoint)))
}

export const deliverPushMessage = async (
  subscriptions: readonly PushSubscriptionRow[],
  message: PushMessage,
  options: PushOptions,
  send: PushSender,
): Promise<PushDeliveryResult> => {
  const deliveries = await Promise.all(subscriptions.map(async subscription => ({
    subscription,
    result: await send(subscription, message, options),
  })))

  deliveries
    .filter(({ result }) => !result.isDelivered && !result.isGone)
    .forEach(({ subscription, result }) => {
      secureLog.warn('A push service refused a message', { status: result.status, pushService: new URL(subscription.endpoint).host })
    })

  return {
    deliveredCount: deliveries.filter(({ result }) => result.isDelivered).length,
    goneIds: deliveries.filter(({ result }) => result.isGone).map(({ subscription }) => subscription.id),
  }
}

export const deleteGoneSubscriptions = async (goneIds: readonly string[], database: Database): Promise<void> => {
  const [firstDelete, ...otherDeletes] = goneIds.map(id => database.delete(pushSubscription).where(eq(pushSubscription.id, id)))

  if (firstDelete) {
    await database.batch([firstDelete, ...otherDeletes])
  }
}

export const sendTestPush = async (userId: string, endpoint: string, database: Database, now: Date): Promise<PushTestResult> => {
  const send = getPushSender(now)

  if (!send) {
    throw createError({ statusCode: 503, message: ERROR_KEYS.PUSH_NOT_CONFIGURED })
  }

  const [found] = await database
    .select({ subscription: pushSubscription, locale: todoDigestSettings.locale })
    .from(pushSubscription)
    .leftJoin(todoDigestSettings, eq(todoDigestSettings.userId, pushSubscription.userId))
    .where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.endpoint, endpoint)))
    .limit(1)

  if (!found) {
    throw createError({ statusCode: 404, message: ERROR_KEYS.PUSH_SUBSCRIPTION_NOT_FOUND })
  }

  const message = buildTestPushMessage(found.locale ?? DEFAULT_LOCALE)
  const { deliveredCount, goneIds } = await deliverPushMessage([found.subscription], message, TEST_PUSH_OPTIONS, send)

  await deleteGoneSubscriptions(goneIds, database)

  if (goneIds.length > 0) {
    throw createError({ statusCode: 404, message: ERROR_KEYS.PUSH_SUBSCRIPTION_NOT_FOUND })
  }

  if (deliveredCount === 0) {
    throw createError({ statusCode: 502, message: ERROR_KEYS.PUSH_DELIVERY_FAILED })
  }

  return { deliveredCount }
}
