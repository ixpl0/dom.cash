import { TODO_DIGEST_TAG } from '~~/shared/schemas/push'
import type { PushDevicePayload } from '~~/shared/types/push'
import { decodeBase64Url, encodeBase64Url } from '~~/shared/utils/shared/base64url'
import type { SupportedLocale } from '~~/shared/utils/shared/locale'
import { isValidTimeZone } from '~~/shared/utils/shared/time-zones'

export type ServiceWorkerMessage = { type: 'todo-changed' } | { type: 'navigate', url: string }

export const SERVICE_WORKER_URL = '/sw.js'

const FALLBACK_TIME_ZONE = 'UTC'

const PUSH_OWNER_STORAGE_KEY = 'push-subscription-owner'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isAppPath = (url: unknown): url is string =>
  typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')

export const parseServiceWorkerMessage = (data: unknown): ServiceWorkerMessage | null => {
  if (!isRecord(data)) {
    return null
  }
  if (data.type === 'todo-changed') {
    return { type: 'todo-changed' }
  }
  if (data.type === 'navigate' && isAppPath(data.url)) {
    return { type: 'navigate', url: data.url }
  }
  return null
}

export const isPushSupported = (): boolean =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export const readDeviceTimeZone = (): string => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return isValidTimeZone(timeZone) ? timeZone : FALLBACK_TIME_ZONE
}

export const toPushDevicePayload = (subscription: PushSubscription, locale: SupportedLocale): PushDevicePayload => {
  const { endpoint = '', keys = {} } = subscription.toJSON()
  return {
    endpoint,
    keys: { p256dh: keys.p256dh ?? '', auth: keys.auth ?? '' },
    timeZone: readDeviceTimeZone(),
    locale,
  }
}

export const hasServerKey = (subscription: PushSubscription, publicKey: string): boolean => {
  const { applicationServerKey } = subscription.options
  return applicationServerKey !== null && encodeBase64Url(new Uint8Array(applicationServerKey)) === publicKey
}

export const getBrowserPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) {
    return null
  }
  const registration = await navigator.serviceWorker.getRegistration()
  return registration ? registration.pushManager.getSubscription() : null
}

export const subscribeBrowserPush = async (publicKey: string): Promise<PushSubscription> => {
  await navigator.serviceWorker.register(SERVICE_WORKER_URL)
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()

  if (existing && hasServerKey(existing, publicKey)) {
    return existing
  }

  await existing?.unsubscribe()
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeBase64Url(publicKey) })
}

const withStorage = <T>(action: () => T, fallback: T): T => {
  try {
    return action()
  }
  catch {
    return fallback
  }
}

export const readPushOwner = (): string | null =>
  withStorage(() => localStorage.getItem(PUSH_OWNER_STORAGE_KEY), null)

export const rememberPushOwner = (userId: string): void =>
  withStorage(() => localStorage.setItem(PUSH_OWNER_STORAGE_KEY, userId), undefined)

export const forgetPushOwner = (): void =>
  withStorage(() => localStorage.removeItem(PUSH_OWNER_STORAGE_KEY), undefined)

export const unsubscribeBrowserPush = async (): Promise<void> => {
  const subscription = await getBrowserPushSubscription()
  await subscription?.unsubscribe()
  forgetPushOwner()
}

export const closeTodoDigestNotifications = async (): Promise<void> => {
  if (!isPushSupported()) {
    return
  }
  const registration = await navigator.serviceWorker.getRegistration()
  const notifications = await registration?.getNotifications({ tag: TODO_DIGEST_TAG }) ?? []
  notifications.forEach(notification => notification.close())
}
