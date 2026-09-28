import type { H3Event } from 'h3'
import { sendNotification } from '~~/server/services/notifications'
import type { User } from '~~/shared/types'
import type { NotificationParams, NotificationType } from '~~/shared/types/i18n'

export interface DocsNotification {
  ownerId: string
  recipientIds: readonly string[]
  type: NotificationType
  params: NotificationParams
}

export const notifyDocsParticipants = async (
  event: H3Event,
  actor: User,
  { ownerId, recipientIds, type, params }: DocsNotification,
): Promise<void> => {
  const targetUserIds = [...new Set(recipientIds)].filter(userId => userId !== actor.id)

  await Promise.all(targetUserIds.map(targetUserId => sendNotification(event, {
    sourceUserId: actor.id,
    budgetOwnerId: ownerId,
    targetUserId,
    type,
    params: { username: actor.username, ...params },
  })))
}
