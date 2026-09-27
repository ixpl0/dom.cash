import { setHeader } from 'h3'
import { requireAuth } from '~~/server/utils/session'
import { addConnection, removeConnection } from '~~/server/services/notifications'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  setHeader(event, 'content-type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'cache-control', 'no-cache, no-transform')
  setHeader(event, 'connection', 'keep-alive')
  setHeader(event, 'cross-origin-resource-policy', 'same-origin')
  setHeader(event, 'x-accel-buffering', 'no')

  let keepAlive: ReturnType<typeof setInterval> | null = null
  const connectionId = crypto.randomUUID()

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      const write = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data))
        }
        catch {
          cleanup()
        }
      }

      const close = () => {
        try {
          controller.close()
        }
        catch {
          // Stream already closed
        }
      }

      const cleanup = () => {
        if (keepAlive) {
          clearInterval(keepAlive)
          keepAlive = null
        }
        removeConnection(user.id, connectionId)
        close()
      }

      addConnection(user.id, connectionId, { write, close })

      write('data: {"type":"connected"}\n\n')

      keepAlive = setInterval(() => {
        write('data: {"type":"ping"}\n\n')
      }, 30000)
    },
    cancel() {
      if (keepAlive) {
        clearInterval(keepAlive)
        keepAlive = null
      }
      removeConnection(user.id, connectionId)
    },
  })

  return stream
})
