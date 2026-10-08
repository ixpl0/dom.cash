import { toSupportedLocale } from '~~/shared/utils/shared/locale'
import { isPushSupported, parseServiceWorkerMessage, SERVICE_WORKER_URL } from '~/utils/push'

export default defineNuxtPlugin({
  name: 'service-worker',
  setup: (nuxtApp) => {
    window.addEventListener('beforeinstallprompt', keepInstallPrompt)
    window.addEventListener('appinstalled', forgetInstallPrompt)

    if (!('serviceWorker' in navigator)) {
      return
    }

    const { $i18n } = useNuxtApp()
    const { user } = useAuthState()
    const todoStore = useTodoStore()
    const notificationsStore = useTodoNotificationsStore()

    navigator.serviceWorker.addEventListener('message', (event: MessageEvent<unknown>) => {
      const message = parseServiceWorkerMessage(event.data)

      if (message?.type === 'todo-changed') {
        todoStore.markStale()
      }
      else if (message?.type === 'navigate') {
        navigateTo(message.url)
      }
    })

    nuxtApp.hook('app:mounted', () => {
      navigator.serviceWorker.register(SERVICE_WORKER_URL).catch((error: unknown) => {
        console.error('Failed to register the service worker', error)
      })

      watch(() => user.value?.id, (userId) => {
        if (!userId || !isPushSupported()) {
          return
        }

        notificationsStore.syncDevice(toSupportedLocale($i18n.locale.value)).catch((error: unknown) => {
          console.error('Failed to sync push notifications', error)
        })
      }, { immediate: true })
    })
  },
})
