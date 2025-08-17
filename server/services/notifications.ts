import { and, desc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import type { NotificationType } from '~~/server/db/schema';
import { budgetShare, notification, user } from '~~/server/db/schema';

export interface CreateNotificationParams {
  sourceUserId: string
  budgetOwnerId: string
  type: NotificationType
  message: string
}

export interface NotificationEvent {
  id: string
  type: NotificationType
  message: string
  sourceUsername: string
  budgetOwnerUsername: string
  createdAt: Date
}

const activeConnections = new Map<string, { write: (data: string) => void, close: () => void }>()
const budgetSubscriptions = new Map<string, Set<string>>() // budgetOwnerId -> Set<subscribedUserId>

export const getActiveConnections = () => activeConnections
export const getBudgetSubscriptions = () => budgetSubscriptions

export const addConnection = (userId: string, connection: { write: (data: string) => void, close: () => void }) => {
  activeConnections.set(userId, connection)
}

export const removeConnection = (userId: string) => {
  const hadConnection = activeConnections.has(userId)
  activeConnections.delete(userId)

  for (const [budgetOwnerId, subscribers] of budgetSubscriptions.entries()) {
    if (subscribers.has(userId)) {
      subscribers.delete(userId)
      if (subscribers.size === 0) {
        budgetSubscriptions.delete(budgetOwnerId)
      }
    }
  }

  if (hadConnection) {
  }
}

export const subscribeToBudget = (userId: string, budgetOwnerId: string) => {
  if (!budgetSubscriptions.has(budgetOwnerId)) {
    budgetSubscriptions.set(budgetOwnerId, new Set())
  }
  budgetSubscriptions.get(budgetOwnerId)!.add(userId)
}

export const unsubscribeFromBudget = (userId: string, budgetOwnerId: string) => {
  const subscribers = budgetSubscriptions.get(budgetOwnerId)
  if (subscribers) {
    subscribers.delete(userId)
    if (subscribers.size === 0) {
      budgetSubscriptions.delete(budgetOwnerId)
    }
  }
}

export const getBudgetSubscribers = (budgetOwnerId: string): string[] => {
  const subscribers = budgetSubscriptions.get(budgetOwnerId)
  return subscribers ? Array.from(subscribers) : []
}

export const sendNotificationToUser = (userId: string, notification: NotificationEvent) => {
  const connection = activeConnections.get(userId)
  if (connection) {
    try {
      const data = `data: ${JSON.stringify(notification)}\n\n`
      connection.write(data)
    }
    catch (error) {
      console.error('Error sending notification to user:', error)
      removeConnection(userId)
    }
  }
}

export const getUsersWithAccessToBudget = async (budgetOwnerId: string): Promise<string[]> => {
  const sharedUsers = await db
    .select({ sharedWithId: budgetShare.sharedWithId })
    .from(budgetShare)
    .where(eq(budgetShare.ownerId, budgetOwnerId))

  return sharedUsers.map(share => share.sharedWithId)
}

export const createNotification = async (params: CreateNotificationParams): Promise<void> => {
  const subscribers = getBudgetSubscribers(params.budgetOwnerId)

  const targetUsers = subscribers.filter(userId => userId !== params.sourceUserId)

  if (targetUsers.length === 0) {
    return
  }

  const sourceUser = await db
    .select({ username: user.username })
    .from(user)
    .where(eq(user.id, params.sourceUserId))
    .limit(1)

  const budgetOwnerUser = await db
    .select({ username: user.username })
    .from(user)
    .where(eq(user.id, params.budgetOwnerId))
    .limit(1)

  if (!sourceUser[0] || !budgetOwnerUser[0]) {
    throw new Error('User not found')
  }

  const notificationEvent: NotificationEvent = {
    id: crypto.randomUUID(),
    type: params.type,
    message: params.message,
    sourceUsername: sourceUser[0].username,
    budgetOwnerUsername: budgetOwnerUser[0].username,
    createdAt: new Date(),
  }

  const now = new Date()
  const notificationsToCreate = targetUsers.map(targetUserId => ({
    id: crypto.randomUUID(),
    targetUserId,
    sourceUserId: params.sourceUserId,
    type: params.type,
    message: params.message,
    budgetOwnerId: params.budgetOwnerId,
    isRead: false,
    createdAt: now,
  }))

  if (notificationsToCreate.length > 0) {
    try {
      await db.insert(notification).values(notificationsToCreate)

      for (const targetUserId of targetUsers) {
        sendNotificationToUser(targetUserId, notificationEvent)
      }
    }
    catch (dbError) {
      console.error('Error creating notifications:', dbError)
      throw dbError
    }
  }
}

export const getUserNotifications = async (userId: string) => {
  return await db
    .select({
      id: notification.id,
      type: notification.type,
      message: notification.message,
      budgetOwnerId: notification.budgetOwnerId,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      sourceUser: {
        username: user.username,
      },
    })
    .from(notification)
    .leftJoin(user, eq(notification.sourceUserId, user.id))
    .where(eq(notification.targetUserId, userId))
    .orderBy(desc(notification.createdAt))
}

export const markNotificationAsRead = async (notificationId: string, userId: string): Promise<void> => {
  await db
    .update(notification)
    .set({ isRead: true })
    .where(and(
      eq(notification.id, notificationId),
      eq(notification.targetUserId, userId),
    ))
}

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  await db
    .update(notification)
    .set({ isRead: true })
    .where(eq(notification.targetUserId, userId))
}

export const deleteOldNotifications = async (daysOld: number = 30): Promise<void> => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  await db
    .delete(notification)
    .where(eq(notification.createdAt, cutoffDate))
}
