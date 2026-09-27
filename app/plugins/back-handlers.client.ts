import { createBackHandlerManager } from '~/utils/back-handlers'

export default defineNuxtPlugin({
  name: 'back-handlers',
  order: -30,
  setup: (nuxtApp) => {
    const backHandlers = createBackHandlerManager()

    nuxtApp.hook('app:created', () => {
      backHandlers.connectRouter(useRouter())
    })

    nuxtApp.hook('app:mounted', () => {
      backHandlers.syncHistory()
    })

    return {
      provide: {
        backHandlers,
      },
    }
  },
})
