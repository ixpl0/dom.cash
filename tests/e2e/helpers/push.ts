import type { APIRequestContext, BrowserContext, Page } from '@playwright/test'
import { BASE_URL } from '../constants'
import { createUniqueId } from './users'

export interface RecordedPushMessage {
  title: string
  body: string
  tag: string
  url: string
  isSilent: boolean
  todo: { id: string, plannedDate: string } | null
  actions: Array<{ action: string, title: string }>
}

interface RecordedPush {
  endpoint: string
  message: RecordedPushMessage
}

const USER_AGENT_PUBLIC_KEY = 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4'
const USER_AGENT_AUTH_SECRET = 'BTBZMqHH6r4Tts7J_aSIgg'

export const createPushEndpoint = (): string => `https://fcm.googleapis.com/fcm/send/e2e-${createUniqueId()}`

export const stubPushService = async (context: BrowserContext, endpoint: string, permission: NotificationPermission = 'granted'): Promise<void> => {
  await context.addInitScript(({ endpoint, permission, p256dh, auth }) => {
    const storageKey = 'e2e-push-subscription-key'

    const createSubscription = (applicationServerKey: string) => ({
      endpoint,
      options: {
        userVisibleOnly: true,
        applicationServerKey: Uint8Array.from(atob(applicationServerKey), character => character.charCodeAt(0)).buffer,
      },
      toJSON: () => ({ endpoint, expirationTime: null, keys: { p256dh, auth } }),
      unsubscribe: async () => {
        localStorage.removeItem(storageKey)
        return true
      },
    })

    const toBase64 = (key: BufferSource): string => {
      const bytes = key instanceof ArrayBuffer ? new Uint8Array(key) : new Uint8Array(key.buffer, key.byteOffset, key.byteLength)
      return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
    }

    Object.defineProperty(Notification, 'permission', { configurable: true, get: () => permission })
    Notification.requestPermission = async () => permission

    PushManager.prototype.getSubscription = async function () {
      const storedKey = localStorage.getItem(storageKey)
      return (storedKey ? createSubscription(storedKey) : null) as PushSubscription | null
    }

    PushManager.prototype.subscribe = async function (options?: PushSubscriptionOptionsInit) {
      const key = options?.applicationServerKey
      if (!key || typeof key === 'string') {
        throw new Error('The stub expects a binary application server key')
      }
      localStorage.setItem(storageKey, toBase64(key))
      return createSubscription(toBase64(key)) as unknown as PushSubscription
    }
  }, { endpoint, permission, p256dh: USER_AGENT_PUBLIC_KEY, auth: USER_AGENT_AUTH_SECRET })
}

export const readRecordedPushes = async (request: APIRequestContext, endpoint: string): Promise<RecordedPushMessage[]> => {
  const response = await request.get(`${BASE_URL}/api/test/push-messages`, { params: { endpoint } })

  if (!response.ok()) {
    throw new Error(`Reading push messages failed with status ${response.status()}: ${await response.text()}`)
  }

  const pushes: RecordedPush[] = await response.json()
  return pushes.map(({ message }) => message)
}

export const sendTodoDigestNow = async (request: APIRequestContext, today: string): Promise<number> => {
  const response = await request.post(`${BASE_URL}/api/test/todo-digest`, { data: { today } })

  if (!response.ok()) {
    throw new Error(`Sending the digest failed with status ${response.status()}: ${await response.text()}`)
  }

  const { deliveredCount }: { deliveredCount: number } = await response.json()
  return deliveredCount
}

export const openTodoNotifications = async (page: Page): Promise<void> => {
  await page.getByTestId('todo-notifications-button').click()
  await page.getByTestId('todo-notifications-modal').waitFor()
}
