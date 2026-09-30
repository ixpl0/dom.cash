import { AUTH_CHANNEL_NAME, isSessionLost, parseAuthMessage, shouldReloadForAuthMessage, type AuthMessage } from '~/utils/session-sync'

const readRequestUrl = (request: RequestInfo | URL): string => {
  if (typeof request === 'string') {
    return request
  }
  return request instanceof URL ? request.href : request.url
}

export default defineNuxtPlugin({
  name: 'session-sync',
  dependsOn: ['back-handlers'],
  setup: () => {
    const { $backHandlers } = useNuxtApp()
    const { user } = useAuthState()
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(AUTH_CHANNEL_NAME)
    const originalFetch = globalThis.fetch.bind(globalThis)

    let isEnding = false

    const endSession = (): void => {
      if (isEnding) {
        return
      }
      isEnding = true
      $backHandlers.forgetGuardEntry()
      window.location.reload()
    }

    const announce = (message: AuthMessage): void => {
      channel?.postMessage(message)
    }

    const announceSignOut = (): void => {
      isEnding = true
      announce({ type: 'signed-out' })
    }

    const announceSignIn = (userId: string): void => {
      announce({ type: 'signed-in', userId })
    }

    if (channel) {
      channel.onmessage = (event: MessageEvent<unknown>) => {
        const message = parseAuthMessage(event.data)
        if (message && shouldReloadForAuthMessage(message, user.value?.id ?? null)) {
          endSession()
        }
      }
    }

    globalThis.fetch = async (request: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const response = await originalFetch(request, init)
      const check = {
        requestUrl: readRequestUrl(request),
        status: response.status,
        isSignedIn: Boolean(user.value),
      }
      if (isSessionLost(check, window.location.origin)) {
        endSession()
      }
      return response
    }

    return {
      provide: {
        sessionSync: { announceSignOut, announceSignIn },
      },
    }
  },
})
