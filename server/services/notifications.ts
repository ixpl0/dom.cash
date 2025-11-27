import type { H3Event } from 'h3'
import { secureLog } from '~~/server/utils/secure-logger'

export type NotificationType
  = | 'budget_currency_changed'
    | 'budget_month_added'
    | 'budget_month_deleted'
    | 'budget_entry_created'
    | 'budget_entry_updated'
    | 'budget_entry_deleted'
    | 'budget_share_updated'
    | 'budget_imported'

export interface CreateNotificationParams {
  sourceUserId: string
  sourceUsername: string
  budgetOwnerId: string
  budgetOwnerUsername: string
  type: NotificationType
  message: string
}

export interface NotificationEvent {
  id: string
  type: NotificationType
  message: string
  sourceUserId: string
  sourceUsername: string
  budgetOwnerUsername: string
  createdAt: string
}

export const createNotification = async (
  params: CreateNotificationParams,
  event: H3Event,
): Promise<void> => {
  const env = event.context.cloudflare?.env
  if (!env?.BUDGET_NOTIFICATIONS) {
    secureLog.warn('BUDGET_NOTIFICATIONS binding not available')
    return
  }

  const notification: NotificationEvent = {
    id: crypto.randomUUID(),
    type: params.type,
    message: params.message,
    sourceUserId: params.sourceUserId,
    sourceUsername: params.sourceUsername,
    budgetOwnerUsername: params.budgetOwnerUsername,
    createdAt: new Date().toISOString(),
  }

  try {
    const durableObjectId = env.BUDGET_NOTIFICATIONS.idFromName(params.budgetOwnerId)
    const stub = env.BUDGET_NOTIFICATIONS.get(durableObjectId)

    await stub.fetch('https://do/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Exclude-User-Id': params.sourceUserId,
      },
      body: JSON.stringify(notification),
    })
  }
  catch (error) {
    secureLog.error('Failed to broadcast notification:', error)
  }
}
