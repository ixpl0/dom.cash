/// <reference types="@cloudflare/workers-types" />

export interface NotificationMessage {
  id: string
  type: string
  message: string
  sourceUserId: string
  sourceUsername: string
  budgetOwnerUsername: string
  createdAt: string
}

interface WebSocketSession {
  socket: WebSocket
  userId: string
  username: string
}

export class BudgetNotificationRoom implements DurableObject {
  private sessions: Array<WebSocketSession> = []

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: unknown,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/websocket') {
      return this.handleWebSocketUpgrade(request)
    }

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      return this.handleBroadcast(request)
    }

    return new Response('Not found', { status: 404 })
  }

  private handleWebSocketUpgrade(request: Request): Response {
    const userId = request.headers.get('X-User-Id')
    const username = request.headers.get('X-Username')

    if (!userId || !username) {
      return new Response('Missing user info', { status: 400 })
    }

    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]

    this.state.acceptWebSocket(server)

    this.sessions = [
      ...this.sessions,
      { socket: server, userId, username },
    ]

    server.send(JSON.stringify({ type: 'connected', userId }))

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    const notification = await request.json() as NotificationMessage
    const excludeUserId = request.headers.get('X-Exclude-User-Id')

    const message = JSON.stringify(notification)

    const remainingSessions: Array<WebSocketSession> = []

    for (const session of this.sessions) {
      if (session.userId === excludeUserId) {
        remainingSessions.push(session)
        continue
      }

      try {
        session.socket.send(message)
        remainingSessions.push(session)
      }
      catch {
        try {
          session.socket.close(1011, 'Error sending message')
        }
        catch { /* Socket already closed */ }
      }
    }

    this.sessions = remainingSessions

    return new Response(JSON.stringify({ sent: remainingSessions.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): void { /* Client messages ignored */ }

  webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void {
    this.sessions = this.sessions.filter(session => session.socket !== ws)
  }

  webSocketError(ws: WebSocket, _error: unknown): void {
    this.sessions = this.sessions.filter(session => session.socket !== ws)
    try {
      ws.close(1011, 'WebSocket error')
    }
    catch { /* Socket already closed */ }
  }
}
