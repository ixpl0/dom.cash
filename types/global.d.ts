type I18nComposer = ReturnType<typeof import('vue-i18n')['useI18n']>
type Translate = I18nComposer['t']

declare module '#app' {
  interface NuxtApp {
    $t: Translate
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $t: Translate
  }
}

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          prompt: (callback?: (notification: {
            isNotDisplayed(): boolean
            isSkippedMoment(): boolean
          }) => void) => void
          renderButton: (element: HTMLElement, options: {
            theme?: 'outline' | 'filled_blue' | 'filled_black'
            size?: 'large' | 'medium' | 'small'
          }) => void
        }
      }
    }
  }
}

export {}
