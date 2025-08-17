const bannerRef = ref<{ show: () => void, hide: () => void } | null>(null)

export const useOutdatedBanner = () => {
  const setBannerRef = (ref: { show: () => void, hide: () => void } | null) => {
    bannerRef.value = ref
  }

  const showBanner = () => {
    bannerRef.value?.show()
  }

  const hideBanner = () => {
    bannerRef.value?.hide()
  }

  return {
    setBannerRef,
    showBanner,
    hideBanner,
  }
}
