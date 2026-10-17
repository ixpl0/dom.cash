import type { TestContext } from 'node:test'
import { parseServerMessage } from '../../../app/utils/notifications'
import { addConnection, removeConnection } from '../../../server/services/notifications'
import type { NotificationEvent } from '../../../shared/types/i18n'

const SSE_DATA_PREFIX = 'data: '
const SSE_FRAME_END = '\n\n'

const parseDataFrame = (frame: string): NotificationEvent => {
  const message = frame.startsWith(SSE_DATA_PREFIX) && frame.endsWith(SSE_FRAME_END)
    ? parseServerMessage(frame.slice(SSE_DATA_PREFIX.length))
    : null

  if (!message || message.type === 'connected' || message.type === 'ping') {
    throw new Error(`Not a notification frame: ${JSON.stringify(frame)}`)
  }

  return message
}

export const listenToNotifications = (context: TestContext, userId: string): () => NotificationEvent[] => {
  const connectionId = crypto.randomUUID()
  let frames: readonly string[] = []

  addConnection(userId, connectionId, {
    write: (frame) => {
      frames = frames.concat(frame)
    },
    close: () => {},
  })
  context.after(() => removeConnection(userId, connectionId))

  return () => frames.map(parseDataFrame)
}
