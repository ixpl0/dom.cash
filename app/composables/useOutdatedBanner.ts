import { ref } from 'vue'

const isOutdatedBannerVisible = ref(false)

export const useOutdatedBanner = () => {
  const showWarningBanner = () => {
    isOutdatedBannerVisible.value = true
  }

  const hideWarningBanner = () => {
    isOutdatedBannerVisible.value = false
  }

  return {
    isOutdatedBannerVisible: readonly(isOutdatedBannerVisible),
    showWarningBanner,
    hideWarningBanner,
  }
}
