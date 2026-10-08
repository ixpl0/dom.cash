import type { PushSettingsData, PushTestResult, TodoDigestSettings } from '~~/shared/types/push'
import { ERROR_KEYS } from '~~/shared/utils/shared/error-keys'
import type { SupportedLocale } from '~~/shared/utils/shared/locale'
import {
  forgetPushOwner,
  getBrowserPushSubscription,
  hasServerKey,
  isPushSupported,
  readPushOwner,
  rememberPushOwner,
  subscribeBrowserPush,
  toPushDevicePayload,
} from '~/utils/push'
import { readServerErrorKey } from '~/utils/server-error'

export type DevicePermission = NotificationPermission | 'unsupported'

export const useTodoNotificationsStore = defineStore('todoNotifications', () => {
  const { user } = useAuthState()

  const publicKey = ref<string | null>(null)
  const settings = ref<TodoDigestSettings | null>(null)
  const permission = ref<DevicePermission>('default')
  const endpoint = ref<string | null>(null)
  const loadError = ref<{ message: string } | null>(null)
  const isLoading = ref(false)
  const isBusy = ref(false)
  const latestSaveId = ref(0)
  const saveQueue = shallowRef<Promise<unknown>>(Promise.resolve())

  const isSubscribed = computed(() => endpoint.value !== null)

  const readPermission = (): DevicePermission => isPushSupported() ? Notification.permission : 'unsupported'

  const readDeviceEndpoint = async (serverKey: string | null): Promise<string | null> => {
    const subscription = await getBrowserPushSubscription()
    const isOwnSubscription = subscription !== null
      && serverKey !== null
      && hasServerKey(subscription, serverKey)
      && readPushOwner() === user.value?.id
    return isOwnSubscription ? subscription.endpoint : null
  }

  const saveDevice = async (subscription: PushSubscription, locale: SupportedLocale): Promise<void> => {
    await $fetch('/api/push/subscription', { method: 'PUT', body: toPushDevicePayload(subscription, locale) })
  }

  const load = async (): Promise<void> => {
    const requestFetch = useRequestFetch()
    isLoading.value = settings.value === null

    try {
      const data = await requestFetch<PushSettingsData>('/api/push/settings')
      publicKey.value = data.publicKey
      settings.value = data.settings
      permission.value = readPermission()
      endpoint.value = await readDeviceEndpoint(data.publicKey)
      loadError.value = null
    }
    catch (error) {
      loadError.value = { message: readServerErrorKey(error) ?? '' }
    }
    finally {
      isLoading.value = false
    }
  }

  const enable = async (locale: SupportedLocale): Promise<void> => {
    const userId = user.value?.id
    const serverKey = publicKey.value

    if (!userId || !serverKey || isBusy.value) {
      return
    }

    isBusy.value = true

    try {
      permission.value = await Notification.requestPermission()

      if (permission.value !== 'granted') {
        return
      }

      const subscription = await subscribeBrowserPush(serverKey)
      await saveDevice(subscription, locale)
      rememberPushOwner(userId)
      endpoint.value = subscription.endpoint
    }
    finally {
      isBusy.value = false
    }
  }

  const disable = async (): Promise<void> => {
    if (isBusy.value) {
      return
    }

    isBusy.value = true

    try {
      const subscription = await getBrowserPushSubscription()

      if (subscription) {
        await $fetch('/api/push/unsubscribe', { method: 'POST', body: { endpoint: subscription.endpoint } })
        await subscription.unsubscribe()
      }

      forgetPushOwner()
      endpoint.value = null
    }
    finally {
      isBusy.value = false
    }
  }

  const saveSettings = async (newSettings: TodoDigestSettings): Promise<void> => {
    const previousSettings = settings.value
    const saveId = latestSaveId.value + 1
    const request = saveQueue.value
      .catch(() => undefined)
      .then(() => $fetch<TodoDigestSettings>('/api/push/settings', { method: 'PUT', body: newSettings }))
    latestSaveId.value = saveId
    saveQueue.value = request
    settings.value = newSettings

    try {
      const savedSettings = await request
      if (saveId === latestSaveId.value) {
        settings.value = savedSettings
      }
    }
    catch (error) {
      if (saveId === latestSaveId.value) {
        settings.value = previousSettings
      }
      throw error
    }
  }

  const sendTest = async (): Promise<void> => {
    if (!endpoint.value) {
      return
    }

    try {
      await $fetch<PushTestResult>('/api/push/test', { method: 'POST', body: { endpoint: endpoint.value } })
    }
    catch (error) {
      if (readServerErrorKey(error) === ERROR_KEYS.PUSH_SUBSCRIPTION_NOT_FOUND) {
        await (await getBrowserPushSubscription())?.unsubscribe()
        forgetPushOwner()
        endpoint.value = null
      }
      throw error
    }
  }

  const syncDevice = async (locale: SupportedLocale): Promise<void> => {
    const userId = user.value?.id

    if (!userId || user.value?.impersonatedBy || readPermission() !== 'granted') {
      return
    }

    const subscription = await getBrowserPushSubscription()

    if (!subscription) {
      return
    }

    if (readPushOwner() !== userId) {
      await subscription.unsubscribe()
      forgetPushOwner()
      return
    }

    const { publicKey: serverKey } = await $fetch<PushSettingsData>('/api/push/settings')

    if (!serverKey) {
      return
    }

    const currentSubscription = hasServerKey(subscription, serverKey) ? subscription : await subscribeBrowserPush(serverKey)
    await saveDevice(currentSubscription, locale)
  }

  return {
    publicKey,
    settings,
    permission,
    loadError,
    isLoading,
    isBusy,
    isSubscribed,
    load,
    enable,
    disable,
    saveSettings,
    sendTest,
    syncDevice,
  }
})
