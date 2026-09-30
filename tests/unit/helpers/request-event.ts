import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createApp, createEvent, eventHandler, type EventHandler, type H3Event } from 'h3'

export const createRequestEvent = (method: string, url: string, headers: Record<string, string> = {}): H3Event => {
  const request = new IncomingMessage(new Socket())
  request.method = method
  request.url = url
  request.headers = headers
  return createEvent(request, new ServerResponse(request))
}

export const routeThrough = (middleware: EventHandler, event: H3Event): Promise<string> =>
  new Promise((resolve, reject) => {
    const app = createApp()
    app.use(middleware)
    app.use(eventHandler((routedEvent) => {
      resolve(routedEvent.path)
      return ''
    }))
    app.handler(event).catch(reject)
  })
