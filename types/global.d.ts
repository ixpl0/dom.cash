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
