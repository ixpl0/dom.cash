import { createError, setHeader } from 'h3'
import { getUserFromRequest } from '~~/server/utils/auth'
import { addConnection, removeConnection } from '~~/server/services/notifications'

export default defineEventHandler(async (event) => {
  const user = await getUserFromRequest(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  setHeader(event, 'content-type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'cache-control', 'no-cache, no-transform')
  setHeader(event, 'connection', 'keep-alive')
  setHeader(event, 'cross-origin-resource-policy', 'same-origin')
  setHeader(event, 'x-accel-buffering', 'no')

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
        clearInterval(keepAlive)
        removeConnection(user.id)
        close()
      }

      addConnection(user.id, { write, close })

      write('data: {"type":"connected"}\n\n')

      const keepAlive = setInterval(() => {
        write('data: {"type":"ping"}\n\n')
      }, 30000)

      event.node.req.on('close', cleanup)
      event.node.req.on('aborted', cleanup)
      event.node.req.on('end', cleanup)
    },
  })

  return stream
})
