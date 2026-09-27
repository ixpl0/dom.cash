import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDatabase } from '~~/server/db'
import { budgetShare } from '~~/server/db/schema'
import type { NotificationEvent, NotificationType, NotificationParams } from '~~/shared/types/i18n'
import { secureLog } from '~~/server/utils/secure-logger'

export type { NotificationType }

export interface CreateNotificationParams {
  sourceUserId: string
  budgetOwnerId: string
  type: NotificationType
  params: NotificationParams
  targetUserId?: string
}

interface NotificationConnection {
  write: (data: string) => void
  close: () => void
}

const activeConnections = new Map<string, Map<string, NotificationConnection>>()
const budgetSubscriptions = new Map<string, Set<string>>()

const removeUserSubscriptions = (userId: string): void => {
  for (const [budgetOwnerId, subscribers] of budgetSubscriptions.entries()) {
    if (subscribers.has(userId)) {
      subscribers.delete(userId)
      if (subscribers.size === 0) {
        budgetSubscriptions.delete(budgetOwnerId)
      }
    }
  }
}

export const addConnection = (
  userId: string,
  connectionId: string,
  connection: NotificationConnection,
): void => {
  const userConnections = activeConnections.get(userId)

  if (!userConnections) {
    activeConnections.set(userId, new Map([[connectionId, connection]]))
    return
  }

  userConnections.set(connectionId, connection)
}

export const removeConnection = (userId: string, connectionId: string): void => {
  const userConnections = activeConnections.get(userId)

  if (!userConnections) {
    return
  }

  userConnections.delete(connectionId)

  if (userConnections.size > 0) {
    return
  }

  activeConnections.delete(userId)
  removeUserSubscriptions(userId)
}

export const subscribeToBudget = (userId: string, budgetOwnerId: string): void => {
  if (!budgetSubscriptions.has(budgetOwnerId)) {
    budgetSubscriptions.set(budgetOwnerId, new Set())
  }
  budgetSubscriptions.get(budgetOwnerId)!.add(userId)
}

export const unsubscribeFromBudget = (userId: string, budgetOwnerId: string): void => {
  const subscribers = budgetSubscriptions.get(budgetOwnerId)
  if (subscribers) {
    subscribers.delete(userId)
    if (subscribers.size === 0) {
      budgetSubscriptions.delete(budgetOwnerId)
    }
  }
}

const getBudgetSubscribers = (budgetOwnerId: string): string[] => {
  const subscribers = budgetSubscriptions.get(budgetOwnerId)
  return subscribers ? Array.from(subscribers) : []
}

const sendNotificationToUser = (userId: string, notification: NotificationEvent): void => {
  const userConnections = activeConnections.get(userId)

  if (!userConnections || userConnections.size === 0) {
    return
  }

  for (const [connectionId, connection] of userConnections.entries()) {
    try {
      const data = `data: ${JSON.stringify(notification)}\n\n`
      connection.write(data)
    }
    catch (error) {
      secureLog.error('Error sending notification to user:', error)
      removeConnection(userId, connectionId)
    }
  }
}

const getNotificationRecipients = async (
  event: H3Event,
  notificationParams: CreateNotificationParams,
): Promise<string[]> => {
  const { budgetOwnerId, sourceUserId, targetUserId, type } = notificationParams
  const targetUsers = targetUserId
    ? [targetUserId]
    : [...new Set([...getBudgetSubscribers(budgetOwnerId), budgetOwnerId])]
        .filter(userId => userId !== sourceUserId)

  const containsBudgetData = type.startsWith('budget_') && !type.startsWith('budget_share_')

  if (!containsBudgetData || targetUsers.every(userId => userId === budgetOwnerId)) {
    return targetUsers
  }

  const database = useDatabase(event)
  const shares = await database
    .select({ userId: budgetShare.sharedWithId })
    .from(budgetShare)
    .where(eq(budgetShare.ownerId, budgetOwnerId))

  const authorizedUsers = new Set([budgetOwnerId, ...shares.map(share => share.userId)])

  return targetUsers.filter(userId => authorizedUsers.has(userId))
}

export const sendNotification = async (event: H3Event, notificationParams: CreateNotificationParams): Promise<void> => {
  try {
    await createNotification(event, notificationParams)
  }
  catch (error) {
    secureLog.error('Error creating notification:', error)
  }
}

export const createNotification = async (event: H3Event, notificationParams: CreateNotificationParams): Promise<void> => {
  const targetUsers = await getNotificationRecipients(event, notificationParams)

  if (targetUsers.length === 0) {
    return
  }

  const notificationEvent: NotificationEvent = {
    id: crypto.randomUUID(),
    type: notificationParams.type,
    params: notificationParams.params,
    budgetOwnerId: notificationParams.budgetOwnerId,
    createdAt: new Date().toISOString(),
  }

  for (const targetUserId of targetUsers) {
    sendNotificationToUser(targetUserId, notificationEvent)
  }
}
