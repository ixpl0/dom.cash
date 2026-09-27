import type { MaybeRefOrGetter } from 'vue'

export const useLiveBudget = (username: MaybeRefOrGetter<string | undefined>): void => {
  const { $liveData } = useNuxtApp()
  let watchedUsername: string | undefined

  onMounted(() => {
    watchedUsername = toValue(username)
    if (watchedUsername) {
      $liveData.watchBudget(watchedUsername)
    }
  })

  onBeforeUnmount(() => {
    if (watchedUsername) {
      $liveData.unwatchBudget(watchedUsername)
    }
  })
}
