import { ref } from 'vue'

const bannerRef = ref<{ show: () => void, hide: () => void } | null>(null)

export const useOutdatedBanner = () => {
  const setWarningBannerRef = (ref: { show: () => void, hide: () => void } | null) => {
    bannerRef.value = ref
  }

  const showWarningBanner = () => {
    bannerRef.value?.show()
  }

  const hideWarningBanner = () => {
    bannerRef.value?.hide()
  }

  return {
    setWarningBannerRef,
    showWarningBanner,
    hideWarningBanner,
  }
}
