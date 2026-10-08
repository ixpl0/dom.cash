import { computed, getCurrentInstance, onMounted, ref, shallowRef } from 'vue'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

const installPrompt = shallowRef<InstallPromptEvent | null>(null)

const isInstallPromptEvent = (event: Event): event is InstallPromptEvent =>
  'prompt' in event && typeof event.prompt === 'function'

export const keepInstallPrompt = (event: Event): void => {
  if (!isInstallPromptEvent(event)) {
    return
  }
  event.preventDefault()
  installPrompt.value = event
}

export const forgetInstallPrompt = (): void => {
  installPrompt.value = null
}

export const useInstallPrompt = () => {
  const isMounted = ref(false)

  if (getCurrentInstance()) {
    onMounted(() => {
      isMounted.value = true
    })
  }

  const canInstall = computed(() => isMounted.value && installPrompt.value !== null)

  const install = async (): Promise<void> => {
    const prompt = installPrompt.value

    if (!prompt) {
      return
    }

    installPrompt.value = null
    await prompt.prompt()
  }

  return { canInstall, install }
}
