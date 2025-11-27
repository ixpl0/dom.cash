import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

const outputPath = join(rootDir, '.output/server/index.mjs')

const doCode = `
// Durable Objects - BudgetNotificationRoom
export class BudgetNotificationRoom {
  constructor(state, env) {
    this.state = state
    this.env = env
    this.sessions = []
  }

  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === '/websocket') {
      return this.handleWebSocketUpgrade(request)
    }

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      return this.handleBroadcast(request)
    }

    return new Response('Not found', { status: 404 })
  }

  handleWebSocketUpgrade(request) {
    const userId = request.headers.get('X-User-Id')
    const username = request.headers.get('X-Username')

    if (!userId || !username) {
      return new Response('Missing user info', { status: 400 })
    }

    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]

    this.state.acceptWebSocket(server)

    this.sessions = [...this.sessions, { socket: server, userId, username }]

    server.send(JSON.stringify({ type: 'connected', userId }))

    return new Response(null, { status: 101, webSocket: client })
  }

  async handleBroadcast(request) {
    const notification = await request.json()
    const excludeUserId = request.headers.get('X-Exclude-User-Id')

    const message = JSON.stringify(notification)
    const remainingSessions = []

    for (const session of this.sessions) {
      if (session.userId === excludeUserId) {
        remainingSessions.push(session)
        continue
      }

      try {
        session.socket.send(message)
        remainingSessions.push(session)
      } catch {
        try {
          session.socket.close(1011, 'Error sending message')
        } catch { /* ignore */ }
      }
    }

    this.sessions = remainingSessions

    return new Response(JSON.stringify({ sent: remainingSessions.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  webSocketMessage() { /* ignore client messages */ }

  webSocketClose(ws) {
    this.sessions = this.sessions.filter(s => s.socket !== ws)
  }

  webSocketError(ws) {
    this.sessions = this.sessions.filter(s => s.socket !== ws)
    try {
      ws.close(1011, 'WebSocket error')
    } catch { /* ignore */ }
  }
}

`

const nitroContent = readFileSync(outputPath, 'utf-8')
writeFileSync(outputPath, doCode + nitroContent)

console.log('✓ Durable Objects injected into .output/server/index.mjs')
