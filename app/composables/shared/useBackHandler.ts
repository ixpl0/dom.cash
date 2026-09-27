import type { MaybeRefOrGetter } from 'vue'
import type { BackHandler } from '~/utils/back-handlers'

export const useBackHandler = (isEnabled: MaybeRefOrGetter<boolean>, onBack: BackHandler): void => {
  if (import.meta.server) {
    return
  }

  const { $backHandlers } = useNuxtApp()
  let removeHandler: (() => void) | null = null

  const disable = (): void => {
    removeHandler?.()
    removeHandler = null
  }

  watch(() => toValue(isEnabled), (isHandlerEnabled) => {
    if (!isHandlerEnabled) {
      disable()
      return
    }

    if (!removeHandler) {
      removeHandler = $backHandlers.addHandler(onBack)
    }
  }, { immediate: true })

  onScopeDispose(disable)
}
